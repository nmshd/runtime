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
    FreeTextRequestItem,
    FreeTextRequestItemJSON,
    IAuthenticationRequestItem,
    IConsentRequestItem,
    ICreateAttributeRequestItem,
    IDeleteAttributeRequestItem,
    IFreeTextRequestItem,
    IProposeAttributeRequestItem,
    IReadAttributeRequestItem,
    IRegisterAttributeListenerRequestItem,
    IShareAttributeRequestItem,
    ProposeAttributeRequestItem,
    ProposeAttributeRequestItemJSON,
    ReadAttributeRequestItem,
    ReadAttributeRequestItemJSON,
    RegisterAttributeListenerRequestItem,
    RegisterAttributeListenerRequestItemJSON,
    ShareAttributeRequestItem,
    ShareAttributeRequestItemJSON
} from "./items";

export interface RequestItemJSON extends ContentJSON {
    /**
     * The human-readable title of this item.
     */
    title?: string;

    /**
     * The human-readable description of this item.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this item. The content
     * of this property will be copied into the response on the side of the recipient, so
     * the sender can use it to identify the group content as they receive the response.
     */
    metadata?: object;

    /**
     * If set to `true`, the recipient has to accept this group if he wants to accept the
     * Request.
     * If set to `false`, the recipient can decide whether he wants to accept it or not.
     *
     * Caution: this setting does not take effect in case it is inside of a
     * {@link RequestItemGroupJSON RequestItemGroup}, which is not accepted by the recipient,
     * since a {@link RequestItemJSON RequestItem} can only be accepted if the parent group
     * is accepted as well.
     */
    mustBeAccepted: boolean;

    /**
     * If set to `true`, it advices the recipient of this RequestItem to carefully consider
     * their decision and especially do not decide based on some automation rules.
     */
    requireManualDecision?: boolean;
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
    | FreeTextRequestItemJSON
    | RegisterAttributeListenerRequestItemJSON;

export interface IRequestItem extends ISerializable {
    /**
     * The human-readable title of this item.
     */
    title?: string;

    /**
     * The human-readable description of this item.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this item. The content
     * of this property will be copied into the response on the side of the recipient, so
     * the sender can use it to identify the group content as they receive the response.
     */
    metadata?: object;

    /**
     * If set to `true`, the recipient has to accept this group if he wants to accept the
     * Request.
     * If set to `false`, the recipient can decide whether he wants to accept it or not.
     *
     * Caution: this setting does not take effect in case it is inside of a
     * {@link RequestItemGroup RequestItemGroup}, which is not accepted by the recipient,
     * since a {@link RequestItem RequestItem} can only be accepted if the parent group
     * is accepted as well.
     */
    mustBeAccepted: boolean;

    /**
     * If set to `true`, it advices the recipient of this RequestItem to carefully consider
     * their decision and especially do not decide based on some automation rules.
     */
    requireManualDecision?: boolean;
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
    | IFreeTextRequestItem
    | IRegisterAttributeListenerRequestItem;

export abstract class RequestItem extends Serializable {
    @serialize()
    @validate({ nullable: true, max: 200 })
    public title?: string;

    @serialize()
    @validate({ nullable: true, max: 500 })
    public description?: string;

    @serialize()
    @validate()
    public mustBeAccepted: boolean;

    @serialize()
    @validate({ nullable: true })
    public metadata?: object;

    @serialize()
    @validate({ nullable: true })
    public requireManualDecision?: boolean;

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
    | FreeTextRequestItem
    | RegisterAttributeListenerRequestItem;
