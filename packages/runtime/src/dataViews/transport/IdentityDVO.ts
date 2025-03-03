import { DataViewObject } from "../DataViewObject";
import { RelationshipDVO } from "./RelationshipDVO";

export interface IdentityDVO extends DataViewObject {
    type: "IdentityDVO";

    publicKey?: string;
    initials: string;
    isSelf: boolean;
    hasRelationship: boolean;
    relationship?: RelationshipDVO;
    originalName?: string;
}
