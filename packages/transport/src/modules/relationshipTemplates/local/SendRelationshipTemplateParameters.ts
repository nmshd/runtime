import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { validateMaxNumberOfAllocations } from "./CachedRelationshipTemplate";

export interface ISendRelationshipTemplateParameters extends ISerializable {
    content: ISerializable;
    expiresAt: ICoreDate;
    maxNumberOfAllocations?: number;
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

    public static from(value: ISendRelationshipTemplateParameters): SendRelationshipTemplateParameters {
        return this.fromAny(value);
    }
}
