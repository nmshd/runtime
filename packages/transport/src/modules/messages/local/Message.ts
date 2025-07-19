import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { IMessageRecipient, MessageRecipient } from "./MessageRecipient";

export interface IBackboneMessageContents {
    createdBy: CoreAddress;
    createdByDevice: CoreId;
    recipients: MessageRecipient[];
    attachments: CoreId[];
    content: Serializable;
    createdAt: CoreDate;
    receivedByEveryone: boolean;
}

export interface IMessage extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    recipients: IMessageRecipient[];
    createdAt: ICoreDate;
    attachments?: ICoreId[];
    receivedByEveryone: boolean;
    content: ISerializable;
    metadata?: any;
    metadataModifiedAt?: ICoreDate;
    wasReadAt?: ICoreDate;
}

@type("Message")
export class Message extends CoreSynchronizable implements IMessage {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Message>((r) => r.secretKey),
        nameof<Message>((r) => r.isOwn),
        nameof<Message>((r) => r.createdBy),
        nameof<Message>((r) => r.createdByDevice),
        nameof<Message>((r) => r.recipients),
        nameof<Message>((r) => r.createdAt),
        nameof<Message>((r) => r.attachments),
        nameof<Message>((r) => r.receivedByEveryone)
    ];

    public override readonly contentProperties = [nameof<Message>((r) => r.content)];

    public override readonly metadataProperties = [nameof<Message>((r) => r.metadata), nameof<Message>((r) => r.metadataModifiedAt)];

    public override readonly userdataProperties = [nameof<Message>((r) => r.wasReadAt)];

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public isOwn: boolean;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize({ type: MessageRecipient })
    public recipients: MessageRecipient[];

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate({ nullable: true })
    @serialize({ type: CoreId })
    public attachments: CoreId[];

    @validate()
    @serialize()
    public receivedByEveryone: boolean;

    @validate()
    @serialize()
    public content: Serializable;

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

    public setMetadata(metadata: any): this {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
        return this;
    }

    public updateWithBackboneData(cachedMessage: IBackboneMessageContents): void {
        this.createdBy = cachedMessage.createdBy;
        this.createdByDevice = cachedMessage.createdByDevice;
        this.recipients = cachedMessage.recipients;
        this.attachments = cachedMessage.attachments;
        this.content = cachedMessage.content;
        this.createdAt = cachedMessage.createdAt;
        this.receivedByEveryone = cachedMessage.receivedByEveryone;
    }
}
