import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, ICoreDate } from "@nmshd/core-types";
import { ContentJSON } from "../ContentJSON";
import { IRequestItemDerivations, RequestItemDerivations, RequestItemJSONDerivations } from "./RequestItem";
import { IRequestItemGroup, RequestItemGroup, RequestItemGroupJSON } from "./RequestItemGroup";

export interface RequestJSON extends ContentJSON {
    "@type": "Request";

    id?: string;

    /**
     * The point in time the request is considered obsolete either technically (e.g. the request is no longer
     * valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer
     * of interest).
     * @default undefined - the request won't expire
     */
    expiresAt?: string;

    /**
     * The items of the Request. Can be either a single {@link RequestItemJSONDerivations RequestItem} or a {@link RequestItemGroupJSON RequestItemGroup}, which itself can contain
     * further {@link RequestItemJSONDerivations RequestItems}.
     */
    items: (RequestItemGroupJSON | RequestItemJSONDerivations)[];

    /**
     * The human-readable title of this Request.
     */
    title?: string;

    /**
     * The human-readable description of this Request.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this request. The content
     * of this property will be copied into the response on the side of the recipient.
     */
    metadata?: object;
}

export interface IRequest extends ISerializable {
    id?: CoreId;

    /**
     * The point in time the request is considered obsolete either technically (e.g. the request is no longer
     * valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer
     * of interest).
     * @default undefined - the request won't expire
     */
    expiresAt?: ICoreDate;

    /**
     * The items of the Request. Can be either a single {@link IRequestItemDerivations RequestItem} or a {@link IRequestItemGroup RequestItemGroup}, which itself can contain
     * further {@link IRequestItemDerivations RequestItems}.
     */
    items: (IRequestItemGroup | IRequestItemDerivations)[];

    /**
     * The human-readable title of this Request.
     */
    title?: string;

    /**
     * The human-readable description of this Request.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this request. The content
     * of this property will be copied into the response on the side of the recipient.
     */
    metadata?: object;
}

@type("Request")
export class Request extends Serializable implements IRequest {
    @serialize()
    @validate({ nullable: true })
    public id?: CoreId;

    @serialize()
    @validate({ nullable: true })
    public expiresAt?: CoreDate;

    @serialize()
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public items: (RequestItemGroup | RequestItemDerivations)[];

    @serialize()
    @validate({ nullable: true, max: 200 })
    public title?: string;

    @serialize()
    @validate({ nullable: true, max: 500 })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public metadata?: object;

    public static from(value: IRequest | Omit<RequestJSON, "@type">): Request {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RequestJSON {
        return super.toJSON(verbose, serializeAsString) as RequestJSON;
    }
}
