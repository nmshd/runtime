import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreHash, ICoreDate, ICoreHash } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";

export interface IFileMetadata extends ISerializable {
    title?: string;
    description?: string;
    filename: string;

    plaintextHash: ICoreHash;
    secretKey: ICryptoSecretKey;

    filesize: number;
    filemodified?: ICoreDate;
    mimetype: string;
}

@type("FileMetadata")
export class FileMetadata extends Serializable implements IFileMetadata {
    @validate({ nullable: true })
    @serialize()
    public title?: string;

    @validate({ nullable: true })
    @serialize()
    public description?: string;

    @validate()
    @serialize()
    public filename: string;

    @validate()
    @serialize()
    public plaintextHash: CoreHash;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public filesize: number;

    @validate({ nullable: true })
    @serialize()
    public filemodified?: CoreDate;

    @validate()
    @serialize()
    public mimetype: string;

    public static from(value: IFileMetadata): FileMetadata {
        return this.fromAny(value);
    }
}
