import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";
import { validateMaxNumberOfAllocations } from "./CachedRelationshipTemplate";

export interface ISendRelationshipTemplateParameters extends ISerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    maxNumberOfAllocations?: number;
    forIdentity?: ICoreAddress;
    password?: string;
}

@type("SendRelationshipTemplateParameters")
export class SendRelationshipTemplateParameters extends Serializable implements ISendRelationshipTemplateParameters {
    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate({ nullable: true, customValidator: validateMaxNumberOfAllocations })
    @serialize()
    public maxNumberOfAllocations?: number;

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

    public static from(value: ISendRelationshipTemplateParameters): SendRelationshipTemplateParameters {
        return this.fromAny(value);
    }
}
