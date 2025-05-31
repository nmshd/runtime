import { ISerializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId, FileReference } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoHash, CryptoHashAlgorithm, CryptoSecretKey, Encoding } from "@nmshd/crypto";
import { CoreCrypto, CoreHash, TransportCoreErrors } from "../../core";
import { DbCollectionName } from "../../core/DbCollectionName";
import { ControllerName, TransportController } from "../../core/TransportController";
import { AccountController } from "../accounts/AccountController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { BackboneGetFilesResponse } from "./backbone/BackboneGetFiles";
import { BackbonePostFilesResponse } from "./backbone/BackbonePostFiles";
import { FileClient } from "./backbone/FileClient";
import { CachedFile } from "./local/CachedFile";
import { File } from "./local/File";
import { ISendFileParameters, SendFileParameters } from "./local/SendFileParameters";
import { FileMetadata } from "./transmission/FileMetadata";

export class FileController extends TransportController {
    private client: FileClient;
    private files: SynchronizedCollection;

    public constructor(parent: AccountController) {
        super(ControllerName.File, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new FileClient(this.config, this.parent.authenticator, this.transport.correlator);
        this.files = await this.parent.getSynchronizedCollection(DbCollectionName.Files);
        return this;
    }

    public async getFiles(query?: any): Promise<File[]> {
        const files = await this.files.find(query);
        return this.parseArray<File>(files, File);
    }

    public async getFile(id: CoreId): Promise<File | undefined> {
        const doc = await this.files.read(id.toString());
        return doc ? File.from(doc) : undefined;
    }

    public async deleteFile(file: File): Promise<void> {
        if (file.isOwn) {
            const response = await this.client.deleteFile(file.id.toString());
            if (response.isError) throw response.error;
        }

        await this.files.delete(file);
    }

    public async fetchCaches(ids: CoreId[]): Promise<{ id: CoreId; cache: CachedFile }[]> {
        if (ids.length === 0) return [];

        const backboneFiles = await (await this.client.getFiles({ ids: ids.map((id) => id.id) })).value.collect();

        const decryptionPromises = backboneFiles.map(async (f) => {
            const fileDoc = await this.files.read(f.id);
            if (!fileDoc) {
                this._log.error(
                    `File '${f.id}' not found in local database and the cache fetching was therefore skipped. This should not happen and might be a bug in the application logic.`
                );
                return;
            }

            const file = File.from(fileDoc);

            return { id: CoreId.from(f.id), cache: await this.decryptFile(f, file.secretKey) };
        });

        const caches = await Promise.all(decryptionPromises);
        return caches.filter((c) => c !== undefined);
    }

    public async updateCache(ids: string[]): Promise<File[]> {
        if (ids.length < 1) {
            return [];
        }

        const resultItems = (await this.client.getFiles({ ids })).value;
        const promises = [];
        for await (const resultItem of resultItems) {
            promises.push(this.updateCacheOfExistingFileInDb(resultItem.id, resultItem));
        }

        return await Promise.all(promises);
    }

    @log()
    private async updateCacheOfExistingFileInDb(id: string, response?: BackboneGetFilesResponse, ownershipToken?: string): Promise<File> {
        const fileDoc = await this.files.read(id);
        if (!fileDoc) {
            throw TransportCoreErrors.general.recordNotFound(File, id);
        }

        const file = File.from(fileDoc);

        await this.updateCacheOfFile(file, response, ownershipToken);
        await this.files.update(fileDoc, file);
        return file;
    }

    private async updateCacheOfFile(file: File, response?: BackboneGetFilesResponse, ownershipToken?: string): Promise<void> {
        const fileId = file.id.toString();
        if (!response) {
            response = (await this.client.getFile(fileId)).value;
        }

        const cachedFile = await this.decryptFile(response, file.secretKey);
        cachedFile.ownershipToken = ownershipToken ?? cachedFile.ownershipToken;
        file.setCache(cachedFile);

        // Update isOwn, as it is possible that the identity receives an attachment with an own File.
        file.isOwn = this.parent.identity.isMe(cachedFile.owner);
    }

    @log()
    private async decryptFile(response: BackboneGetFilesResponse, secretKey: CryptoSecretKey) {
        const cipher = CryptoCipher.fromBase64(response.encryptedProperties);
        const plaintextMetadataBuffer = await CoreCrypto.decrypt(cipher, secretKey);
        const plaintextMetadata = FileMetadata.deserialize(plaintextMetadataBuffer.toUtf8());

        if (!(plaintextMetadata instanceof FileMetadata)) {
            throw TransportCoreErrors.files.invalidMetadata(response.id);
        }

        const cachedFile = CachedFile.fromBackbone(response, plaintextMetadata);
        return cachedFile;
    }

    public async getOrLoadFileByReference(fileReference: FileReference): Promise<File> {
        return await this.getOrLoadFile(fileReference.id, fileReference.key);
    }

    public async getOrLoadFile(id: CoreId, secretKey: CryptoSecretKey): Promise<File> {
        const fileDoc = await this.files.read(id.toString());
        if (fileDoc) {
            if (fileDoc.cache) return File.from(fileDoc);
            return await this.updateCacheOfExistingFileInDb(id.toString());
        }

        const file = File.from({
            id: id,
            secretKey: secretKey,
            isOwn: false
        });

        await this.updateCacheOfFile(file);

        await this.files.create(file);
        return file;
    }

    @log()
    public async setFileMetadata(idOrFile: CoreId | File, metadata: ISerializable): Promise<File> {
        const id = idOrFile instanceof CoreId ? idOrFile.toString() : idOrFile.id.toString();
        const fileDoc = await this.files.read(id);
        if (!fileDoc) {
            throw TransportCoreErrors.general.recordNotFound(File, id.toString());
        }

        const file = File.from(fileDoc);
        file.setMetadata(metadata);
        await this.files.update(fileDoc, file);
        return file;
    }

    public async sendFile(parameters: ISendFileParameters): Promise<File> {
        const input = SendFileParameters.from(parameters);

        const content = input.buffer;
        const fileSize = content.length;

        if (fileSize > this.config.platformMaxUnencryptedFileSize) {
            throw TransportCoreErrors.files.maxFileSizeExceeded(fileSize, this.config.platformMaxUnencryptedFileSize);
        }

        const plaintextHashBuffer = await CryptoHash.hash(content, CryptoHashAlgorithm.SHA512);
        const plaintextHash = CoreHash.from(plaintextHashBuffer.toBase64URL());

        const signature = await this.parent.activeDevice.sign(plaintextHashBuffer);
        const signatureB64 = signature.toBase64();

        const fileDownloadSecretKey = await CoreCrypto.generateSecretKey();
        const cipher = await CoreCrypto.encrypt(content, fileDownloadSecretKey);
        const cipherBuffer = CoreBuffer.fromBase64URL(cipher.toBase64());
        const cipherHash = await CryptoHash.hash(cipherBuffer, CryptoHashAlgorithm.SHA512);
        const cipherCoreHash = CoreHash.from(cipherHash.toBase64URL());

        const metadata = FileMetadata.from({
            title: input.title,
            description: input.description,
            filename: input.filename,
            filesize: fileSize,
            plaintextHash: plaintextHash,
            secretKey: fileDownloadSecretKey,
            filemodified: input.filemodified,
            mimetype: input.mimetype,
            tags: input.tags
        });

        const serializedMetadata = metadata.serialize();

        const metadataBuffer = CoreBuffer.fromString(serializedMetadata, Encoding.Utf8);
        const metadataKey = await CoreCrypto.generateSecretKey();
        const metadataCipher = await CoreCrypto.encrypt(metadataBuffer, metadataKey);

        const owner = this.parent.identity.address;

        const response: BackbonePostFilesResponse = (
            await this.client.createFile({
                content: cipherBuffer.buffer,
                cipherHash: cipherHash.toBase64URL(),
                owner: owner.toString(),
                ownerSignature: signatureB64,
                expiresAt: input.expiresAt.toString(),
                encryptedProperties: metadataCipher.toBase64()
            })
        ).value;

        const cachedFile = CachedFile.from({
            title: input.title,
            description: input.description,
            filename: input.filename,
            tags: input.tags,
            filesize: fileSize,
            filemodified: input.filemodified,
            cipherKey: fileDownloadSecretKey,
            cipherHash: cipherCoreHash,
            createdAt: CoreDate.from(response.createdAt),
            createdBy: CoreAddress.from(response.createdBy),
            createdByDevice: CoreId.from(response.createdByDevice),
            expiresAt: CoreDate.from(response.expiresAt),
            mimetype: input.mimetype,
            owner: CoreAddress.from(response.owner),
            ownerSignature: signature,
            plaintextHash: plaintextHash,
            ownershipToken: response.ownershipToken
        });

        const file = File.from({
            id: CoreId.from(response.id),
            secretKey: metadataKey,
            isOwn: true
        });
        file.setCache(cachedFile);

        await this.files.create(file);

        return file;
    }

    @log()
    public async downloadFileContent(idOrFile: CoreId | File): Promise<CoreBuffer> {
        const file = idOrFile instanceof File ? idOrFile : await this.getFile(idOrFile);
        if (!file) {
            throw TransportCoreErrors.general.recordNotFound(File, idOrFile.toString());
        }

        if (!file.cache) throw this.newCacheEmptyError(File, file.id.toString());

        const downloadResponse = (await this.client.downloadFile(file.id.toString())).value;
        const buffer = CoreBuffer.fromObject(downloadResponse);

        const hash = await CryptoHash.hash(buffer, CryptoHashAlgorithm.SHA512);
        const hashb64 = hash.toBase64URL();

        if (hashb64 !== file.cache.cipherHash.hash) {
            throw TransportCoreErrors.files.cipherMismatch();
        }

        const cipher = CryptoCipher.fromBase64(buffer.toBase64URL());
        const decrypt = await CoreCrypto.decrypt(cipher, file.cache.cipherKey);
        const plaintextHashesMatch = await file.cache.plaintextHash.verify(decrypt, CryptoHashAlgorithm.SHA512);

        if (!plaintextHashesMatch) {
            throw TransportCoreErrors.files.plaintextHashMismatch();
        }

        return decrypt;
    }

    public async validateFileOwnershipToken(id: CoreId, ownershipToken: string): Promise<{ isValid: boolean }> {
        const response = await this.client.validateFileOwnershipToken(id.toString(), ownershipToken);
        if (response.isError) throw response.error;

        return response.value;
    }

    public async regenerateFileOwnershipToken(id: CoreId): Promise<File> {
        const response = await this.client.regenerateFileOwnershipToken(id.toString());
        if (response.isError) throw response.error;

        const updatedFile = await this.updateCacheOfExistingFileInDb(id.toString(), undefined, response.value.newOwnershipToken);
        return updatedFile;
    }

    public async claimFileOwnership(id: CoreId, ownershipToken: string): Promise<File> {
        const response = await this.client.claimFileOwnership(id.toString(), ownershipToken);
        if (response.isError) throw response.error;

        const updatedFile = await this.updateCacheOfExistingFileInDb(id.toString(), undefined, response.value.newOwnershipToken);
        return updatedFile;
    }
}
