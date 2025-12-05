import { serialize, type, validate } from "@js-soft/ts-serval";
import { RequestItemJSON } from "../..";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface ShareCredentialOfferRequestItemJSON extends RequestItemJSON {
    "@type": "ShareCredentialOfferRequestItem";
    credentialOfferUrl: string;
}

export interface IShareCredentialOfferRequestItem extends IRequestItem {
    credentialOfferUrl: string;
}

@type("ShareCredentialOfferRequestItem")
export class ShareCredentialOfferRequestItem extends RequestItem implements IShareCredentialOfferRequestItem {
    @serialize()
    @validate()
    public credentialOfferUrl: string;

    public static from(
        value: IShareCredentialOfferRequestItem | Omit<ShareCredentialOfferRequestItemJSON, "@type"> | ShareCredentialOfferRequestItemJSON
    ): ShareCredentialOfferRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ShareCredentialOfferRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as ShareCredentialOfferRequestItemJSON;
    }
}
