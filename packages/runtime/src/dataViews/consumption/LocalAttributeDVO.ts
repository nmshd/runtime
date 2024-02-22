import { IdentityAttributeJSON, RelationshipAttributeCreationHintsJSON, RelationshipAttributeJSON, RenderHintsJSON, ValueHintsJSON } from "@nmshd/content";
import { AttributeQueryDVO } from "../content/AttributeDVOs";
import { DataViewObject } from "../DataViewObject";
import { IdentityDVO } from "../transport";

/**
 * The DataViewObject representation of a LocalAttribute
 * @abstract
 */
export interface LocalAttributeDVO extends DataViewObject {
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    owner: string; // Careful: We cannot expand the owner to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)

    value: unknown;
    valueType: string;

    renderHints: RenderHintsJSON;
    valueHints: ValueHintsJSON;

    isDraft: false;
    isOwn: boolean;
    isValid: boolean;

    createdAt: string;
    succeeds?: string;
    succeededBy?: string;
    toBeDeletedAt?: string;
}

/**
 * Original own LocalAttribute DataViewObject
 */
export interface RepositoryAttributeDVO extends LocalAttributeDVO {
    type: "RepositoryAttributeDVO";
    sharedWith: SharedToPeerAttributeDVO[];
    isOwn: true;
    tags: string[];
}

/**
 * LocalAttribute DataViewObject which is shared to a peer
 */
export interface SharedToPeerAttributeDVO extends LocalAttributeDVO {
    type: "SharedToPeerAttributeDVO";
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    requestReference?: string;
    notificationReference?: string;
    sourceAttribute: string;
    isOwn: true;
    tags: string[];
    toBeDeletedByPeerAt?: string;
    deletedByPeerAt?: string;
}

/**
 * LocalAttribute DataViewObject which was received from a peer
 */
export interface PeerAttributeDVO extends LocalAttributeDVO {
    type: "PeerAttributeDVO";
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    requestReference?: string;
    notificationReference?: string;
    isOwn: false;
    tags: string[];
}

/**
 * LocalAttribute DataViewObject which was received from a peer
 */
export interface OwnRelationshipAttributeDVO extends LocalAttributeDVO {
    type: "OwnRelationshipAttributeDVO";
    key: string;
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    requestReference?: string;
    notificationReference?: string;
    isOwn: true;
    confidentiality: string;
    isTechnical: boolean;
    toBeDeletedByPeerAt?: string;
    deletedByPeerAt?: string;
}

/**
 * LocalAttribute DataViewObject which was received from a peer
 */
export interface PeerRelationshipAttributeDVO extends LocalAttributeDVO {
    type: "PeerRelationshipAttributeDVO";
    key: string;
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    requestReference?: string;
    notificationReference?: string;
    isOwn: false;
    confidentiality: string;
    isTechnical: boolean;
}

/**
 * The DataViewObject representation of a processed AttributeQuery.
 * A processed AttributeQuery contains the potential LocalAttributes
 * which fit to this query within the `results` property.
 * @abstract
 */
export interface ProcessedAttributeQueryDVO extends AttributeQueryDVO {
    results: LocalAttributeDVO[];
    isProcessed: true;
}

/**
 * The DataViewObject representation of a processed IdentityAttributeQuery.
 * A processed AttributeQuery contains the potential LocalAttributes
 * which fit to this query within the `results` property.
 */
export interface ProcessedIdentityAttributeQueryDVO extends ProcessedAttributeQueryDVO {
    results: (RepositoryAttributeDVO | SharedToPeerAttributeDVO)[];
    type: "ProcessedIdentityAttributeQueryDVO";
    tags?: string[];
    valueType: string;
    renderHints: RenderHintsJSON;
    valueHints: ValueHintsJSON;
}

/**
 * The DataViewObject representation of a processed RelationshipAttributeQuery.
 * A processed AttributeQuery contains the potential LocalAttributes
 * which fit to this query within the `results` property.
 */
export interface ProcessedRelationshipAttributeQueryDVO extends ProcessedAttributeQueryDVO {
    type: "ProcessedRelationshipAttributeQueryDVO";
    results: (OwnRelationshipAttributeDVO | PeerRelationshipAttributeDVO)[];
    key: string;
    owner: IdentityDVO;
    attributeCreationHints: RelationshipAttributeCreationHintsJSON;
    valueType: string;
    renderHints: RenderHintsJSON;
    valueHints: ValueHintsJSON;
}

/**
 * The DataViewObject representation of a processed ThirdPartyRelationshipAttributeQuery.
 * A processed AttributeQuery contains the potential LocalAttributes
 * which fit to this query within the `results` property.
 */
export interface ProcessedThirdPartyRelationshipAttributeQueryDVO extends ProcessedAttributeQueryDVO {
    type: "ProcessedThirdPartyRelationshipAttributeQueryDVO";
    results: (OwnRelationshipAttributeDVO | PeerRelationshipAttributeDVO)[];
    key: string;
    owner: IdentityDVO;
    thirdParty: IdentityDVO[];
    valueType?: string;
    renderHints?: RenderHintsJSON;
    valueHints?: ValueHintsJSON;
}

export interface ProcessedIQLQueryDVO extends ProcessedAttributeQueryDVO {
    type: "ProcessedIQLQueryDVO";
    results: RepositoryAttributeDVO[];
    valueType?: string;
    renderHints?: RenderHintsJSON;
    valueHints?: ValueHintsJSON;
    tags?: string[];
}
