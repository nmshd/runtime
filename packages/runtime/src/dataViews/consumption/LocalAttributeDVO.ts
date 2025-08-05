import { IdentityAttributeJSON, RelationshipAttributeCreationHintsJSON, RelationshipAttributeJSON, RenderHintsJSON, ValueHintsJSON } from "@nmshd/content";
import { DataViewObject } from "../DataViewObject";
import { AttributeQueryDVO } from "../content/AttributeDVOs";
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

    createdAt: string;
    wasViewedAt?: string;
    succeeds?: string;
    succeededBy?: string;
}

export interface OwnIdentityAttributeDVO extends LocalAttributeDVO {
    type: "OwnIdentityAttributeDVO";
    isOwn: true;
    tags?: string[];
    isDefault?: true;
    forwardingPeers?: string[]; // TODO: check if this can be IdentityDVO[]
    forwardedSharingInfos?: ForwardedSharingInfoDVO[];
}

export interface PeerIdentityAttributeDVO extends LocalAttributeDVO {
    type: "PeerIdentityAttributeDVO";
    isOwn: false;
    tags?: string[];
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    sourceReference: string;
    deletionDate?: string;
    deletionStatus?: string;
}

// TODO: is it okay to have the peerSharingInfo of the initial peer flatted here?
export interface OwnRelationshipAttributeDVO extends LocalAttributeDVO {
    type: "OwnRelationshipAttributeDVO";
    isOwn: true;
    key: string;
    confidentiality: string;
    isTechnical: boolean;
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    sourceReference?: string;
    deletionDate?: string;
    deletionStatus?: string;
    forwardingPeers?: string[]; // TODO: check if this can be IdentityDVO[]
    forwardedSharingInfos?: ForwardedSharingInfoDVO[];
}

export interface PeerRelationshipAttributeDVO extends LocalAttributeDVO {
    type: "PeerRelationshipAttributeDVO";
    isOwn: false;
    key: string;
    confidentiality: string;
    isTechnical: boolean;
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    sourceReference?: string;
    deletionDate?: string;
    deletionStatus?: string;
    forwardingPeers?: string[]; // TODO: check if this can be IdentityDVO[]
    forwardedSharingInfos?: ForwardedSharingInfoDVO[];
}

export interface ThirdPartyRelationshipAttributeDVO extends LocalAttributeDVO {
    type: "ThirdPartyRelationshipAttributeDVO";
    isOwn: false;
    key: string;
    confidentiality: string;
    isTechnical: boolean;
    peer: string; // Careful: We cannot expand the peer to an IdentityDVO, as the IdentityDVO possibly contains the LocalAttributesDVO of the Relationship (endless recursion)
    initialAttributePeer: string;
    sourceReference: string;
    deletionDate?: string;
    deletionStatus?: string;
}

export interface ForwardedSharingInfoDVO {
    type: "ForwardedSharingInfoDVO"; // TODO: check if a type is required
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionDate?: string;
    deletionStatus?: string;
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
    results: OwnIdentityAttributeDVO[];
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
    results: OwnIdentityAttributeDVO[];
    valueType?: string;
    renderHints?: RenderHintsJSON;
    valueHints?: ValueHintsJSON;
    tags?: string[];
}
