import { DataViewObject } from "../DataViewObject.js";
import { RelationshipDVO } from "./RelationshipDVO.js";

export interface IdentityDVO extends DataViewObject {
    type: "IdentityDVO";

    publicKey?: string;
    initials: string;
    isSelf: boolean;
    hasRelationship: boolean;
    relationship?: RelationshipDVO;
    originalName?: string;
}
