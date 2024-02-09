import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";
import { IIdentity, Identity } from "../../accounts/data/Identity";
import { IRelationshipTemplatePublicKey, RelationshipTemplatePublicKey } from "./RelationshipTemplatePublicKey";

export interface IRelationshipTemplateContentWrapper extends ICoreSerializable {
    identity: IIdentity;
    templateKey: IRelationshipTemplatePublicKey;
    content: ISerializable;
}

@type("RelationshipTemplateContentWrapper")
export class RelationshipTemplateContentWrapper extends CoreSerializable implements IRelationshipTemplateContentWrapper {
    @validate()
    @serialize()
    public identity: Identity;

    @validate()
    @serialize()
    public templateKey: RelationshipTemplatePublicKey;

    @validate()
    @serialize()
    public content: Serializable;

    public static from(value: IRelationshipTemplateContentWrapper): RelationshipTemplateContentWrapper {
        return this.fromAny(value);
    }
}
