import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";
import { validateMaxNumberOfAllocations } from "./CachedRelationshipTemplate";

export interface ISendRelationshipTemplateParameters extends ISerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    maxNumberOfAllocations?: number;
    forIdentity?: ICoreAddress;
    password?: string;
    passwordType?: string;
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

    @validate({ nullable: true, disallowedValues: [""] })
    @serialize()
    public password?: string;

    @validate({ nullable: true, regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType?: string;

    public static from(value: ISendRelationshipTemplateParameters): SendRelationshipTemplateParameters {
        return this.fromAny(value);
    }
}
