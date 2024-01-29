import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreSerializable, ICoreAddress, ICoreSerializable } from "../../../core";
import { File, IFile } from "../../files/local/File";

export interface ISendMessageParameters extends ICoreSerializable {
    recipients: ICoreAddress[];
    content: ISerializable;
    attachments?: IFile[];
}

@type("SendMessageParameters")
export class SendMessageParameters extends CoreSerializable implements ISendMessageParameters {
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
