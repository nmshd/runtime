import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, FileReference, ICoreDate } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { CachedFile, ICachedFile } from "./CachedFile";

export interface IFile extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;
    cache?: ICachedFile;
    cachedAt?: ICoreDate;
    metadata?: any;
    metadataModifiedAt?: ICoreDate;
}

@type("File")
export class File extends CoreSynchronizable implements IFile {
    public override readonly technicalProperties = ["@type", "@context", nameof<File>((r) => r.secretKey), nameof<File>((r) => r.isOwn)];
    public override readonly metadataProperties = [nameof<File>((r) => r.metadata), nameof<File>((r) => r.metadataModifiedAt)];

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public isOwn: boolean;

    @validate({ nullable: true })
    @serialize()
    public cache?: CachedFile;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    public static from(value: IFile): File {
        return this.fromAny(value);
    }

    public toFileReference(backboneBaseUrl?: string): FileReference {
        return FileReference.from({ id: this.id, backboneBaseUrl, key: this.secretKey });
    }

    public truncate(backboneBaseUrl?: string): string {
        const reference = this.toFileReference(backboneBaseUrl);
        return reference.truncate();
    }

    public setCache(cache: CachedFile): this {
        this.cache = cache;
        this.cachedAt = CoreDate.utc();
        return this;
    }

    public setMetadata(metadata: any): this {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
        return this;
    }
}
