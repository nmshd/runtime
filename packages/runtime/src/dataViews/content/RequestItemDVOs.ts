import { OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { FormFieldSettingsJSONDerivations } from "@nmshd/content";
import { LocalAttributeDVO } from "../consumption";
import { DataViewObject } from "../DataViewObject";
import { FileDVO } from "../transport";
import { AttributeQueryDVO, DraftIdentityAttributeDVO, DraftRelationshipAttributeDVO } from "./AttributeDVOs";
import { ResponseItemDVO, ResponseItemGroupDVO } from "./ResponseItemDVOs";

export interface RequestItemGroupDVO {
    type: "RequestItemGroupDVO";
    items: RequestItemDVO[];
    title?: string;
    description?: string;
    isDecidable: boolean;
    response?: ResponseItemGroupDVO;
}

export interface RequestItemDVO extends DataViewObject {
    mustBeAccepted: boolean;
    isDecidable: boolean;
    response?: ResponseItemDVO;
}

export interface ReadAttributeRequestItemDVO extends RequestItemDVO {
    type: "ReadAttributeRequestItemDVO";
    query: AttributeQueryDVO;
}

export interface ProposeAttributeRequestItemDVO extends RequestItemDVO {
    type: "ProposeAttributeRequestItemDVO";
    query: AttributeQueryDVO;
    attribute: DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO;
    proposedValueOverruled: boolean;
}

export interface CreateAttributeRequestItemDVO extends RequestItemDVO {
    type: "CreateAttributeRequestItemDVO";
    attribute: DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO;
}

export interface DeleteAttributeRequestItemDVO extends RequestItemDVO {
    type: "DeleteAttributeRequestItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface ShareAttributeRequestItemDVO extends RequestItemDVO {
    type: "ShareAttributeRequestItemDVO";
    attributeId: string;
    initialAttributePeer?: string;
    attribute: DraftIdentityAttributeDVO;
}

export interface AuthenticationRequestItemDVO extends RequestItemDVO {
    type: "AuthenticationRequestItemDVO";
    title: string;
}

export interface ConsentRequestItemDVO extends RequestItemDVO {
    type: "ConsentRequestItemDVO";
    consent: string;
    link?: string;
    linkDisplayText?: string;
    requiresInteraction?: boolean;
}

export interface FormFieldRequestItemDVO extends RequestItemDVO {
    type: "FormFieldRequestItemDVO";
    title: string;
    settings: FormFieldSettingsJSONDerivations;
}

export interface TransferFileOwnershipRequestItemDVO extends RequestItemDVO {
    type: "TransferFileOwnershipRequestItemDVO";
    fileReference: string;
    file: FileDVO;
    ownershipToken: string;
}

export interface ShareCredentialOfferRequestItemDVO extends RequestItemDVO {
    type: "ShareCredentialOfferRequestItemDVO";
    credentialOfferUrl: string;
    credentialResponses?: OpenId4VciCredentialResponseJSON[];
}

export interface ShareAuthorizationRequestRequestItemDVO extends RequestItemDVO {
    type: "ShareAuthorizationRequestRequestItemDVO";
    authorizationRequestUrl: string;
    matchingCredentials: LocalAttributeDVO[];
}
