import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";
import { IPasswordProtectionCreationParameters, PasswordProtectionCreationParameters } from "../../../core/types/PasswordProtectionCreationParameters";
import { validateMaxNumberOfAllocations } from "./RelationshipTemplate";

export interface ISendRelationshipTemplateParameters extends ISerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    maxNumberOfAllocations?: number;
    forIdentity?: ICoreAddress;
    passwordProtection?: IPasswordProtectionCreationParameters;
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

    @validate({ nullable: true })
    @serialize()
    public passwordProtection?: PasswordProtectionCreationParameters;

    public static from(value: ISendRelationshipTemplateParameters): SendRelationshipTemplateParameters {
        return this.fromAny(value);
    }
}
