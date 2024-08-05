import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreSerializable, ICoreAddress, ICoreDate, ICoreSerializable } from "../../../core";

export interface ISendTokenParameters extends ICoreSerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    ephemeral: boolean;
    forIdentity?: ICoreAddress;
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

    @validate()
    @serialize()
    public forIdentity?: CoreAddress;

    public static from(value: ISendTokenParameters): SendTokenParameters {
        return this.fromAny(value);
    }
}
