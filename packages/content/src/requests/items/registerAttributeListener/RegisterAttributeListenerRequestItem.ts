import { serialize, type, validate } from "@js-soft/ts-serval";
import {
    IdentityAttributeQuery,
    IdentityAttributeQueryJSON,
    IIdentityAttributeQuery,
    IThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryJSON
} from "../../../attributes";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface RegisterAttributeListenerRequestItemJSON extends RequestItemJSON {
    "@type": "RegisterAttributeListenerRequestItem";
    query: IdentityAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON;
}

export interface IRegisterAttributeListenerRequestItem extends IRequestItem {
    query: IIdentityAttributeQuery | IThirdPartyRelationshipAttributeQuery;
}

@type("RegisterAttributeListenerRequestItem")
export class RegisterAttributeListenerRequestItem extends RequestItem implements IRegisterAttributeListenerRequestItem {
    @serialize({
        unionTypes: [IdentityAttributeQuery, ThirdPartyRelationshipAttributeQuery]
    })
    @validate()
    public query: IdentityAttributeQuery | ThirdPartyRelationshipAttributeQuery;

    public static from(
        value: IRegisterAttributeListenerRequestItem | Omit<RegisterAttributeListenerRequestItemJSON, "@type"> | RegisterAttributeListenerRequestItemJSON
    ): RegisterAttributeListenerRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RegisterAttributeListenerRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as RegisterAttributeListenerRequestItemJSON;
    }
}
