import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export interface ISendEmptyTokenParameters extends ISerializable {
    expiresAt: ICoreDate;
}

@type("SendEmptyTokenParameters")
export class SendEmptyTokenParameters extends Serializable implements ISendEmptyTokenParameters {
    @validate()
    @serialize()
    public expiresAt: CoreDate;

    public static from(value: ISendEmptyTokenParameters): SendEmptyTokenParameters {
        return this.fromAny(value);
    }
}
