import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, FileReference, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, CryptoSignature, ICryptoSecretKey, ICryptoSignature } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreHash, CoreSynchronizable, ICoreHash, ICoreSynchronizable } from "../../../core/index.js";
import { BackboneGetFilesResponse } from "../backbone/BackboneGetFiles.js";
import { FileMetadata } from "../transmission/FileMetadata.js";

export interface IFile extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;

    title?: string;
    filename: string;
    tags?: string[];
    filesize: number;
    filemodified?: CoreDate;
    mimetype: string;
    cipherHash: ICoreHash;
    createdAt: ICoreDate;
    expiresAt: ICoreDate;
    cipherKey: ICryptoSecretKey;
    description?: string;
    owner: CoreAddress;
    ownerSignature: ICryptoSignature;
    plaintextHash: ICoreHash;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    deletedAt?: ICoreDate;
    deletedBy?: ICoreAddress;
    deletedByDevice?: ICoreId;

    metadata?: any;
    metadataModifiedAt?: ICoreDate;
    ownershipToken?: string;
    ownershipIsLocked?: true;
}

@type("File")
export class File extends CoreSynchronizable implements IFile {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<File>((r) => r.secretKey),
        nameof<File>((r) => r.isOwn),
        nameof<File>((r) => r.ownershipToken),
        nameof<File>((r) => r.ownershipIsLocked),
        nameof<File>((f) => f.filesize),
        nameof<File>((f) => f.filemodified),
        nameof<File>((f) => f.mimetype),
        nameof<File>((f) => f.cipherHash),
        nameof<File>((f) => f.createdAt),
        nameof<File>((f) => f.expiresAt),
        nameof<File>((f) => f.cipherKey),
        nameof<File>((f) => f.owner),
        nameof<File>((f) => f.ownerSignature),
        nameof<File>((f) => f.plaintextHash),
        nameof<File>((f) => f.createdBy),
        nameof<File>((f) => f.createdByDevice),
        nameof<File>((f) => f.deletedAt),
        nameof<File>((f) => f.deletedBy),
        nameof<File>((f) => f.deletedByDevice)
    ];
    public override readonly contentProperties = [nameof<File>((f) => f.title), nameof<File>((f) => f.description), nameof<File>((f) => f.filename), nameof<File>((f) => f.tags)];
    public override readonly metadataProperties = [nameof<File>((r) => r.metadata), nameof<File>((r) => r.metadataModifiedAt)];

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public isOwn: boolean;

    @validate({ nullable: true })
    @serialize()
    public title?: string;

    @validate()
    @serialize()
    public filename: string;

    @validate({ nullable: true })
    @serialize({ type: String })
    public tags?: string[];

    @validate()
    @serialize()
    public filesize: number;

    @validate({ nullable: true })
    @serialize()
    public filemodified?: CoreDate;

    @validate()
    @serialize()
    public mimetype: string;

    @validate()
    @serialize()
    public cipherHash: CoreHash;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public description?: string;

    @validate()
    @serialize()
    public owner: CoreAddress;

    @validate()
    @serialize()
    public ownerSignature: CryptoSignature;

    @validate()
    @serialize()
    public plaintextHash: CoreHash;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize()
    public cipherKey: CryptoSecretKey;

    @validate({ nullable: true })
    @serialize()
    public deletedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public deletedBy?: CoreAddress;

    @validate({ nullable: true })
    @serialize()
    public deletedByDevice?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public ownershipToken?: string;

    @validate({ nullable: true })
    @serialize()
    public ownershipIsLocked?: true;

    public static from(value: IFile): File {
        return this.fromAny(value);
    }

    public toFileReference(backboneBaseUrl: string): FileReference {
        return FileReference.from({ id: this.id, backboneBaseUrl, key: this.secretKey });
    }

    public setMetadata(metadata: any): this {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
        return this;
    }

    public setOwnershipToken(token: string): this {
        if (!this.isOwn) throw new Error("Cannot set ownership token on peer file.");

        this.ownershipToken = token;
        this.ownershipIsLocked = undefined;
        return this;
    }

    public setOwnershipIsLocked(): this {
        this.ownershipIsLocked = true;
        return this;
    }

    public clearOwnershipToken(): this {
        if (this.isOwn) throw new Error("Cannot clear ownership token on own file.");

        this.ownershipToken = undefined;
        this.ownershipIsLocked = undefined;
        return this;
    }

    public static fromBackbone(
        localData: {
            id: CoreId;
            secretKey: ICryptoSecretKey;
            isOwn: boolean;
        },
        backboneResponse: BackboneGetFilesResponse,
        metadata: FileMetadata
    ): File {
        return File.from({
            id: localData.id,
            secretKey: CryptoSecretKey.from(localData.secretKey),
            isOwn: localData.isOwn,
            title: metadata.title,
            description: metadata.description,
            cipherKey: metadata.secretKey,
            filemodified: metadata.filemodified,
            filename: metadata.filename,
            tags: metadata.tags,
            filesize: metadata.filesize,
            plaintextHash: metadata.plaintextHash,
            deletedAt: backboneResponse.deletedAt ? CoreDate.from(backboneResponse.deletedAt) : undefined,
            deletedBy: backboneResponse.deletedBy ? CoreAddress.from(backboneResponse.deletedBy) : undefined,
            deletedByDevice: backboneResponse.deletedByDevice ? CoreId.from(backboneResponse.deletedByDevice) : undefined,
            cipherHash: CoreHash.from(backboneResponse.cipherHash),
            createdAt: CoreDate.from(backboneResponse.createdAt),
            createdBy: CoreAddress.from(backboneResponse.createdBy),
            createdByDevice: CoreId.from(backboneResponse.createdByDevice),
            expiresAt: CoreDate.from(backboneResponse.expiresAt),
            mimetype: metadata.mimetype,
            owner: CoreAddress.from(backboneResponse.owner),
            ownerSignature: CryptoSignature.fromBase64(backboneResponse.ownerSignature)
        });
    }
}
