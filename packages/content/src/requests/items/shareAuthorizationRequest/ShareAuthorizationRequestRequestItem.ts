import { serialize, type, validate } from "@js-soft/ts-serval";
import { RequestItemJSON } from "../..";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface ShareAuthorizationRequestRequestItemJSON extends RequestItemJSON {
    "@type": "ShareAuthorizationRequestRequestItem";
    authorizationRequestUrl: string;
}

export interface IShareAuthorizationRequestRequestItem extends IRequestItem {
    authorizationRequestUrl: string;
}

@type("ShareAuthorizationRequestRequestItem")
export class ShareAuthorizationRequestRequestItem extends RequestItem implements IShareAuthorizationRequestRequestItem {
    @serialize()
    @validate()
    public authorizationRequestUrl: string;

    public static from(
        value: IShareAuthorizationRequestRequestItem | Omit<ShareAuthorizationRequestRequestItemJSON, "@type"> | ShareAuthorizationRequestRequestItemJSON
    ): ShareAuthorizationRequestRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ShareAuthorizationRequestRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as ShareAuthorizationRequestRequestItemJSON;
    }
}
