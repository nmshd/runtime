import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";

export interface ISendTokenParameters extends ISerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    ephemeral: boolean;
    forIdentity?: ICoreAddress;
    password?: string;
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

    @validate({ nullable: true })
    @serialize()
    public forIdentity?: CoreAddress;

    @validate({
        nullable: true,
        customValidator: (input) => {
            if (/^\d+$/.test(input) && (input.length > 12 || input.length < 2)) {
                return "PINs must be at least 2 and at most 12 digits long";
            }
            return undefined;
        }
    })
    @serialize()
    public password?: string;

    public static from(value: ISendTokenParameters): SendTokenParameters {
        return this.fromAny(value);
    }
}
