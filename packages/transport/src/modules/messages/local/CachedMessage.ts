/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, CoreSerializable, ICoreAddress, ICoreId, ICoreSerializable } from "../../../core";
import { CoreDate, ICoreDate } from "../../../core/types/CoreDate";
import { CachedMessageRecipient, ICachedMessageRecipient } from "./CachedMessageRecipient";

export interface ICachedMessage extends ICoreSerializable {
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;

    recipients: ICachedMessageRecipient[];

    createdAt: ICoreDate;

    attachments?: ICoreId[];
    receivedByEveryone: boolean;

    content: ISerializable;
}

@type("CachedMessage")
export class CachedMessage extends CoreSerializable implements ICachedMessage {
    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize({ type: CachedMessageRecipient })
    public recipients: CachedMessageRecipient[];

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate({ nullable: true })
    @serialize({ type: CoreId })
    public attachments: CoreId[];

    @validate()
    @serialize()
    public receivedByEveryone: boolean = false;

    @validate()
    @serialize()
    public content: Serializable;

    public static from(value: ICachedMessage): CachedMessage {
        return this.fromAny(value);
    }
}
