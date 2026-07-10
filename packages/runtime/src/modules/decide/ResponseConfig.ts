import { IdentityAttribute, RelationshipAttribute } from "@nmshd/content";

export interface RejectResponseConfig {
    accept: false;
    code?: string;
    message?: string;
}

export function isRejectResponseConfig(input: any): input is RejectResponseConfig {
    return input.accept === false;
}

export interface AcceptResponseConfig {
    accept: true;
}

export function isAcceptResponseConfig(input: any): input is AcceptResponseConfig {
    return input.accept === true;
}

export function isSimpleAcceptResponseConfig(input: any): input is AcceptResponseConfig {
    return input.accept === true && Object.keys(input).length === 1;
}

export interface DeleteAttributeAcceptResponseConfig extends AcceptResponseConfig {
    deletionDate: string;
}

export function isDeleteAttributeAcceptResponseConfig(object: any): object is DeleteAttributeAcceptResponseConfig {
    return "deletionDate" in object;
}

export interface ProposeAttributeWithNewAttributeAcceptResponseConfig extends AcceptResponseConfig {
    attribute: IdentityAttribute | RelationshipAttribute;
}

export function isProposeAttributeWithNewAttributeAcceptResponseConfig(object: any): object is ProposeAttributeWithNewAttributeAcceptResponseConfig {
    return "attribute" in object;
}

export interface ReadAttributeWithNewAttributeAcceptResponseConfig extends AcceptResponseConfig {
    newAttribute: IdentityAttribute | RelationshipAttribute;
}

export function isReadAttributeWithNewAttributeAcceptResponseConfig(object: any): object is ReadAttributeWithNewAttributeAcceptResponseConfig {
    return "newAttribute" in object;
}

export type AcceptResponseConfigDerivation =
    | AcceptResponseConfig
    | DeleteAttributeAcceptResponseConfig
    | ProposeAttributeWithNewAttributeAcceptResponseConfig
    | ReadAttributeWithNewAttributeAcceptResponseConfig;

export type ResponseConfig = AcceptResponseConfigDerivation | RejectResponseConfig;
