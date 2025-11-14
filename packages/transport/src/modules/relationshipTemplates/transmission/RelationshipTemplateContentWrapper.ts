import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IIdentity, Identity } from "../../accounts/data/Identity.js";
import { IRelationshipTemplatePublicKey, RelationshipTemplatePublicKey } from "./RelationshipTemplatePublicKey.js";

export interface IRelationshipTemplateContentWrapper extends ISerializable {
    identity: IIdentity;
    templateKey: IRelationshipTemplatePublicKey;
    content: ISerializable;
}

@type("RelationshipTemplateContentWrapper")
export class RelationshipTemplateContentWrapper extends Serializable implements IRelationshipTemplateContentWrapper {
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
