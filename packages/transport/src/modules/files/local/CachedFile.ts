import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, CryptoSignature, ICryptoSecretKey, ICryptoSignature } from "@nmshd/crypto";
import { CoreHash, ICoreHash } from "../../../core";
import { BackboneGetFilesResponse } from "../backbone/BackboneGetFiles";
import { FileMetadata } from "../transmission/FileMetadata";

export interface ICachedFile extends ISerializable {
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
    originalFilename?: string;
    owner: CoreAddress;
    ownerSignature: ICryptoSignature;
    plaintextHash: ICoreHash;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    deletedAt?: ICoreDate;
    deletedBy?: ICoreAddress;
    deletedByDevice?: ICoreId;
    ownershipToken?: string;
    ownershipIsLocked?: true;
}

@type("CachedFile")
export class CachedFile extends Serializable implements ICachedFile {
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
    public ownershipToken?: string;

    @validate({ nullable: true })
    @serialize()
    public ownershipIsLocked?: true;

    public static from(value: ICachedFile): CachedFile {
        return this.fromAny(value);
    }

    public static fromBackbone(backboneResponse: BackboneGetFilesResponse, metadata: FileMetadata): CachedFile {
        return CachedFile.from({
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
