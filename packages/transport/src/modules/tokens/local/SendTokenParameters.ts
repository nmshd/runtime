import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "../../../core";

export interface ISendTokenParameters extends ICoreSerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    ephemeral: boolean;
}

@type("SendTokenParameters")
export class SendTokenParameters extends CoreSerializable implements ISendTokenParameters {
    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate()
    @serialize()
    public ephemeral: boolean;

    public static from(value: ISendTokenParameters): SendTokenParameters {
        return this.fromAny(value);
    }
}
