import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export interface ICreateEmptyTokenWithoutPasswordProtectionParameters extends ISerializable {
    expiresAt?: ICoreDate;
}

@type("CreateEmptyTokenWithoutPasswordProtectionParameters")
export class CreateEmptyTokenWithoutPasswordProtectionParameters extends Serializable implements ICreateEmptyTokenWithoutPasswordProtectionParameters {
    @validate({ nullable: true })
    @serialize()
    public expiresAt?: CoreDate;

    public static from(value: ICreateEmptyTokenWithoutPasswordProtectionParameters): CreateEmptyTokenWithoutPasswordProtectionParameters {
        return this.fromAny(value);
    }
}
