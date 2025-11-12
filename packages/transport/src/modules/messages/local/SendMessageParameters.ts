import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { File, IFile } from "../../files/local/File.js";

export interface ISendMessageParameters extends ISerializable {
    recipients: ICoreAddress[];
    content: ISerializable;
    attachments?: IFile[];
}

@type("SendMessageParameters")
export class SendMessageParameters extends Serializable implements ISendMessageParameters {
    @validate()
    @serialize({ type: CoreAddress })
    public recipients: CoreAddress[];

    @validate()
    @serialize()
    public content: Serializable;

    @validate({ nullable: true })
    @serialize({ type: File })
    public attachments?: File[];

    public static from(value: ISendMessageParameters): SendMessageParameters {
        return this.fromAny(value);
    }
}
