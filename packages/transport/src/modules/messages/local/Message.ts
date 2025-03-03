import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { CachedMessage, ICachedMessage } from "./CachedMessage";

export interface IMessage extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;
    cache?: ICachedMessage;
    cachedAt?: ICoreDate;
    metadata?: any;
    metadataModifiedAt?: ICoreDate;
    wasReadAt?: ICoreDate;
}

@type("Message")
export class Message extends CoreSynchronizable implements IMessage {
    public override readonly technicalProperties = ["@type", "@context", nameof<Message>((r) => r.secretKey), nameof<Message>((r) => r.isOwn)];

    public override readonly metadataProperties = [nameof<Message>((r) => r.metadata), nameof<Message>((r) => r.metadataModifiedAt)];

    public override readonly userdataProperties = [nameof<Message>((r) => r.wasReadAt)];

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public isOwn: boolean;

    @validate({ nullable: true })
    @serialize()
    public cache?: CachedMessage;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public wasReadAt?: CoreDate;

    public static from(value: IMessage): Message {
        return this.fromAny(value);
    }

    public setCache(cache: CachedMessage): this {
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
