import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";
import { CoreAddress, ICoreAddress } from "../../../core/types/CoreAddress";
import { CoreDate, ICoreDate } from "../../../core/types/CoreDate";
import { FileReference, IFileReference } from "../../files/transmission/FileReference";

export interface IMessageContentWrapper extends ICoreSerializable {
    attachments?: IFileReference[];
    content: ISerializable;
    createdAt?: ICoreDate;
    recipients: ICoreAddress[];
}

/**
 * MessageContentWrapper is a container for the actual message as [[IMessage]], its creationDate and
 * the list of recipients as [[IAddress]]. This container instance is then digitally signed
 * by the sender via an [[MessageSigned]] object.
 *
 * Insofar, the sender digitally signs the date of creation of this message (which could act as a
 * legal proof). Additionally, all recipients can - and must - check if they are addressed by
 * the sender. If a recipient is not in the signed list of recipients, the message needs to be
 * ignored (as the whole message could have been forwarded by bad party to a wrong recipient).
 */
@type("MessageContentWrapper")
export class MessageContentWrapper extends CoreSerializable implements IMessageContentWrapper {
    @validate()
    @serialize({ type: FileReference })
    public attachments: FileReference[] = [];
    @validate()
    @serialize()
    public content: Serializable;
    @validate()
    @serialize()
    public createdAt: CoreDate;
    @validate()
    @serialize({ type: CoreAddress })
    public recipients: CoreAddress[];

    protected static override preFrom(value: any): any {
        if (typeof value.attachments === "undefined") {
            value.attachments = [];
        }

        return value;
    }

    public static from(value: IMessageContentWrapper): MessageContentWrapper {
        return this.fromAny(value);
    }
}
