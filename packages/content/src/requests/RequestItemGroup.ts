import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";
import { IRequestItemDerivations, RequestItemDerivations, RequestItemJSONDerivations } from "./RequestItem.js";

/**
 * A RequestItemGroup can be used to group one or more RequestItems. This is useful
 * if you want to visually group RequestItems on the UI and give them a common `title` or `description`.
 */
export interface RequestItemGroupJSON extends ContentJSON {
    "@type": "RequestItemGroup";

    /**
     * The human-readable title of this group.
     */
    title?: string;

    /**
     * The human-readable description of this group.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this group. The content
     * of this property will be copied into the response on the side of the recipient, so
     * the sender can use it to identify the group content as they receive the response.
     */
    metadata?: object;

    /**
     * The items of this group.
     */
    items: RequestItemJSONDerivations[];
}

/**
 * A RequestItemGroup can be used to group one or more RequestItems. This is useful
 * if you want to visually group RequestItems on the UI and give them a common `title` or `description`.
 */
export interface IRequestItemGroup extends ISerializable {
    /**
     * The human-readable title of this group.
     */
    title?: string;

    /**
     * The human-readable description of this group.
     */
    description?: string;

    /**
     * This property can be used to add some arbitrary metadata to this group. The content
     * of this property will be copied into the response on the side of the recipient, so
     * the sender can use it to identify the group content as they receive the response.
     */
    metadata?: object;

    /**
     * The items of this group.
     */
    items: IRequestItemDerivations[];
}

@type("RequestItemGroup")
export class RequestItemGroup extends Serializable {
    @serialize()
    @validate({ nullable: true, max: 200 })
    public title?: string;

    @serialize()
    @validate({ nullable: true, max: 500 })
    public description?: string;

    @serialize()
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public items: RequestItemDerivations[];

    @serialize()
    @validate({ nullable: true })
    public metadata?: object;

    public static from(value: IRequestItemGroup | Omit<RequestItemGroupJSON, "@type">): RequestItemGroup {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RequestItemGroupJSON {
        return super.toJSON(verbose, serializeAsString) as RequestItemGroupJSON;
    }
}
