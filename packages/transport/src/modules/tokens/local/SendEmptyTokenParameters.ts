import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export interface ISendEmptyTokenParameters extends ISerializable {
    expiresAt: ICoreDate;
    ephemeral: boolean;
    withPassword?: boolean;
}

@type("SendEmptyTokenParameters")
export class SendEmptyTokenParameters extends Serializable implements ISendEmptyTokenParameters {
    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate()
    @serialize()
    public ephemeral: boolean;

    @validate({ nullable: true })
    @serialize()
    public withPassword?: boolean;

    public static from(value: ISendEmptyTokenParameters): SendEmptyTokenParameters {
        return this.fromAny(value);
    }
}
