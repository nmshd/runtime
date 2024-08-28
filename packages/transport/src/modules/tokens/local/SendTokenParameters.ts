import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export interface ISendTokenParameters extends ISerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    ephemeral: boolean;
}

@type("SendTokenParameters")
export class SendTokenParameters extends Serializable implements ISendTokenParameters {
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
