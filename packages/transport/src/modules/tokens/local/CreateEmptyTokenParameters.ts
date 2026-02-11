import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export interface ICreateEmptyTokenParameters extends ISerializable {
    expiresAt?: ICoreDate;
}

@type("CreateEmptyTokenParameters")
export class CreateEmptyTokenParameters extends Serializable implements ICreateEmptyTokenParameters {
    @validate({ nullable: true })
    @serialize()
    public expiresAt?: CoreDate;

    public static from(value: ICreateEmptyTokenParameters): CreateEmptyTokenParameters {
        return this.fromAny(value);
    }
}
