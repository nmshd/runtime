import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import {
    AuthenticationRequestItem,
    AuthenticationRequestItemJSON,
    ConsentRequestItem,
    ConsentRequestItemJSON,
    CreateAttributeRequestItem,
    CreateAttributeRequestItemJSON,
    DeleteAttributeRequestItem,
    DeleteAttributeRequestItemJSON,
    FormFieldRequestItem,
    FormFieldRequestItemJSON,
    IAuthenticationRequestItem,
    IConsentRequestItem,
    ICreateAttributeRequestItem,
    IDeleteAttributeRequestItem,
    IFormFieldRequestItem,
    IProposeAttributeRequestItem,
    IReadAttributeRequestItem,
    IShareAttributeRequestItem,
    IShareCredentialOfferRequestItem,
    ITransferFileOwnershipRequestItem,
    ProposeAttributeRequestItem,
    ProposeAttributeRequestItemJSON,
    ReadAttributeRequestItem,
    ReadAttributeRequestItemJSON,
    ShareAttributeRequestItem,
    ShareAttributeRequestItemJSON,
    ShareCredentialOfferRequestItem,
    ShareCredentialOfferRequestItemJSON,
    TransferFileOwnershipRequestItem,
    TransferFileOwnershipRequestItemJSON
} from "./items";

export interface RequestItemJSON extends ContentJSON {
    /**
     * The human-readable description of this item.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this item. The content
     * of this property will be copied into the response on the side of the recipient, so
     * the sender can use it to identify the item as they receive the response.
     */
    metadata?: object;

    /**
     * If set to `true`, the recipient has to accept this item if they want to accept the
     * Request.
     * If set to `false`, the recipient can decide whether they want to accept it or not.
     */
    mustBeAccepted: boolean;
}

export type RequestItemJSONDerivations =
    | RequestItemJSON
    | CreateAttributeRequestItemJSON
    | DeleteAttributeRequestItemJSON
    | ShareAttributeRequestItemJSON
    | ProposeAttributeRequestItemJSON
    | ReadAttributeRequestItemJSON
    | ConsentRequestItemJSON
    | AuthenticationRequestItemJSON
    | FormFieldRequestItemJSON
    | TransferFileOwnershipRequestItemJSON
    | ShareCredentialOfferRequestItemJSON;

export interface IRequestItem extends ISerializable {
    /**
     * The human-readable description of this item.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this item. The content
     * of this property will be copied into the response on the side of the recipient, so
     * the sender can use it to identify the item as they receive the response.
     */
    metadata?: object;

    /**
     * If set to `true`, the recipient has to accept this item if they want to accept the
     * Request.
     * If set to `false`, the recipient can decide whether they want to accept it or not.
     */
    mustBeAccepted: boolean;
}

export type IRequestItemDerivations =
    | IRequestItem
    | ICreateAttributeRequestItem
    | IDeleteAttributeRequestItem
    | IShareAttributeRequestItem
    | IProposeAttributeRequestItem
    | IReadAttributeRequestItem
    | IConsentRequestItem
    | IAuthenticationRequestItem
    | IFormFieldRequestItem
    | ITransferFileOwnershipRequestItem
    | IShareCredentialOfferRequestItem;

export abstract class RequestItem extends Serializable {
    @serialize()
    @validate({ nullable: true, max: 500 })
    public description?: string;

    @serialize()
    @validate()
    public mustBeAccepted: boolean;

    @serialize()
    @validate({ nullable: true })
    public metadata?: object;

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as RequestItemJSON;
    }
}

export type RequestItemDerivations =
    | RequestItem
    | CreateAttributeRequestItem
    | DeleteAttributeRequestItem
    | ShareAttributeRequestItem
    | ProposeAttributeRequestItem
    | ReadAttributeRequestItem
    | ConsentRequestItem
    | AuthenticationRequestItem
    | FormFieldRequestItem
    | TransferFileOwnershipRequestItem
    | ShareCredentialOfferRequestItem;

export function isRequestItemDerivation(input: any): input is RequestItemDerivations {
    return (
        input["@type"] === "RequestItem" ||
        input["@type"] === "CreateAttributeRequestItem" ||
        input["@type"] === "DeleteAttributeRequestItem" ||
        input["@type"] === "ShareAttributeRequestItem" ||
        input["@type"] === "ProposeAttributeRequestItem" ||
        input["@type"] === "ReadAttributeRequestItem" ||
        input["@type"] === "ConsentRequestItem" ||
        input["@type"] === "AuthenticationRequestItem" ||
        input["@type"] === "FormFieldRequestItem" ||
        input["@type"] === "TransferFileOwnershipRequestItem"
    );
}
