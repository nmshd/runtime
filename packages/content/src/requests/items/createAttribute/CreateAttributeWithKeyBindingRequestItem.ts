import { serialize, type, validate } from "@js-soft/ts-serval";
import { RequestItemJSON } from "../..";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, VerifiableCredential, VerifiableCredentialJSON } from "../../../attributes";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface CreateAttributeWithKeyBindingRequestItemJSON extends RequestItemJSON {
    "@type": "CreateAttributeWithKeyBindingRequestItem";
    attribute: IdentityAttributeJSON<VerifiableCredentialJSON>;
    credentialConfigurationId: string;
}

export interface ICreateAttributeWithKeyBindingRequestItem extends IRequestItem {
    attribute: IIdentityAttribute;
    credentialConfigurationId: string;
}

@type("CreateAttributeWithKeyBindingRequestItem")
export class CreateAttributeWithKeyBindingRequestItem extends RequestItem implements ICreateAttributeWithKeyBindingRequestItem {
    @validate()
    @serialize()
    public attribute: IdentityAttribute<VerifiableCredential>;

    @validate()
    @serialize()
    public credentialConfigurationId: string;

    public static from(
        value: ICreateAttributeWithKeyBindingRequestItem | Omit<CreateAttributeWithKeyBindingRequestItemJSON, "@type"> | CreateAttributeWithKeyBindingRequestItemJSON
    ): CreateAttributeWithKeyBindingRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): CreateAttributeWithKeyBindingRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as CreateAttributeWithKeyBindingRequestItemJSON;
    }
}
