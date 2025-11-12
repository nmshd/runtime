import { type ISerializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId, FileReference } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoHash, CryptoSecretKey, Encoding } from "@nmshd/crypto";
import { DbCollectionName } from "../../core/DbCollectionName.js";
import { CoreCrypto, CoreHash, TransportCoreErrors } from "../../core/index.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { AccountController } from "../accounts/AccountController.js";
import { SynchronizedCollection } from "../sync/SynchronizedCollection.js";
import { type BackboneGetFilesResponse } from "./backbone/BackboneGetFiles.js";
import { BackbonePostFilesResponse } from "./backbone/BackbonePostFiles.js";
import { FileClient } from "./backbone/FileClient.js";
import { File } from "./local/File.js";
import { ISendFileParameters, SendFileParameters } from "./local/SendFileParameters.js";
import { FileMetadata } from "./transmission/FileMetadata.js";

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

    public async updateFileFromBackbone(id: string): Promise<File> {
        const fileDoc = await this.files.read(id);
        if (!fileDoc) throw TransportCoreErrors.general.recordNotFound(File, id);

        const file = File.from(fileDoc);

        const backboneGetFileResponse = await this.client.getFile(id.toString());
        const response = backboneGetFileResponse.value;

        const plaintextMetadata = await this.decryptFile(response, file.secretKey);

        const updatedFile = File.fromBackbone(
            {
                id: file.id,
                secretKey: file.secretKey,
                isOwn: this.parent.identity.isMe(CoreAddress.from(response.owner))
            },
            response,
            plaintextMetadata
        );

        await this.files.update(fileDoc, updatedFile);
        return updatedFile;
    }

    public async getOrLoadFileByReference(fileReference: FileReference): Promise<File> {
        return await this.getOrLoadFile(fileReference.id, fileReference.key);
    }

    public async getOrLoadFile(id: CoreId, secretKey: CryptoSecretKey): Promise<File> {
        const fileDoc = await this.files.read(id.toString());
        if (fileDoc) return File.from(fileDoc);

        const backboneGetFileResponse = await this.client.getFile(id.toString());
        const response = backboneGetFileResponse.value;

        const plaintextMetadata = await this.decryptFile(response, secretKey);

        const file = File.fromBackbone(
            {
                id: id,
                secretKey: secretKey,
                isOwn: false
            },
            response,
            plaintextMetadata
        );

        await this.files.create(file);
        return file;
    }

    @log()
    private async decryptFile(response: BackboneGetFilesResponse, secretKey: CryptoSecretKey) {
        const cipher = CryptoCipher.fromBase64(response.encryptedProperties);
        const plaintextMetadataBuffer = await CoreCrypto.decrypt(cipher, secretKey);
        const plaintextMetadata = FileMetadata.deserialize(plaintextMetadataBuffer.toUtf8());

        if (!(plaintextMetadata instanceof FileMetadata)) {
            throw TransportCoreErrors.files.invalidMetadata(response.id);
        }

        return plaintextMetadata;
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

        const plaintextHashBuffer = await CryptoHash.hash(content, 2);
        const plaintextHash = CoreHash.from(plaintextHashBuffer.toBase64URL());

        const signature = await this.parent.activeDevice.sign(plaintextHashBuffer);
        const signatureB64 = signature.toBase64();

        const fileDownloadSecretKey = await CoreCrypto.generateSecretKey();
        const cipher = await CoreCrypto.encrypt(content, fileDownloadSecretKey);
        const cipherBuffer = CoreBuffer.fromBase64URL(cipher.toBase64());
        const cipherHash = await CryptoHash.hash(cipherBuffer, 2);
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

        const file = File.from({
            id: CoreId.from(response.id),
            secretKey: metadataKey,
            isOwn: true,
            ownershipToken: response.ownershipToken,
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
            plaintextHash: plaintextHash
        });

        await this.files.create(file);

        return file;
    }

    @log()
    public async downloadFileContent(idOrFile: CoreId | File): Promise<CoreBuffer> {
        const file = idOrFile instanceof File ? idOrFile : await this.getFile(idOrFile);
        if (!file) {
            throw TransportCoreErrors.general.recordNotFound(File, idOrFile.toString());
        }

        const downloadResponse = (await this.client.downloadFile(file.id.toString())).value;
        const buffer = CoreBuffer.fromObject(downloadResponse);

        const hash = await CryptoHash.hash(buffer, 2);
        const hashb64 = hash.toBase64URL();

        if (hashb64 !== file.cipherHash.hash) {
            throw TransportCoreErrors.files.cipherMismatch();
        }

        const cipher = CryptoCipher.fromBase64(buffer.toBase64URL());
        const decrypt = await CoreCrypto.decrypt(cipher, file.cipherKey);
        const plaintextHashesMatch = await file.plaintextHash.verify(decrypt, 2);

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

        const file = await this.getFile(id);
        if (!file) {
            throw TransportCoreErrors.general.recordNotFound(File, id.toString());
        }

        const fileWithNewOwnershipToken = file.setOwnershipToken(response.value.newOwnershipToken);
        const updatedFile = await this.updateFile(fileWithNewOwnershipToken);
        return updatedFile;
    }

    public async claimFileOwnership(id: CoreId, ownershipToken: string): Promise<File> {
        const fileId = id.toString();

        const response = await this.client.claimFileOwnership(fileId, ownershipToken);
        if (response.isError) throw response.error;

        const fileWithNewOwner = await this.updateFileFromBackbone(fileId);
        const fileWithNewOwnershipToken = fileWithNewOwner.setOwnershipToken(response.value.newOwnershipToken);
        const updatedFile = await this.updateFile(fileWithNewOwnershipToken);
        return updatedFile;
    }

    public async updateFile(file: File): Promise<File> {
        const fileDoc = await this.files.read(file.id.toString());
        if (!fileDoc) throw TransportCoreErrors.general.recordNotFound(File, file.id.toString());

        await this.files.update(fileDoc, file);
        return file;
    }
}
