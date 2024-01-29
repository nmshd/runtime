import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreSerializable } from "../../../core";
import { validateMaxNumberOfAllocations } from "./CachedRelationshipTemplate";

export interface ISendRelationshipTemplateParameters extends ICoreSerializable {
    content: ISerializable;
    expiresAt: CoreDate;
    maxNumberOfAllocations?: number;
}

@type("SendRelationshipTemplateParameters")
export class SendRelationshipTemplateParameters extends CoreSerializable implements ISendRelationshipTemplateParameters {
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
