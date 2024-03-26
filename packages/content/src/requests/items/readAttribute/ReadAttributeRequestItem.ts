import { serialize, type, validate } from "@js-soft/ts-serval";
import {
    IdentityAttributeQuery,
    IdentityAttributeQueryJSON,
    IIdentityAttributeQuery,
    IIQLQuery,
    IQLQuery,
    IQLQueryJSON,
    IRelationshipAttributeQuery,
    IThirdPartyRelationshipAttributeQuery,
    RelationshipAttributeQuery,
    RelationshipAttributeQueryJSON,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryJSON
} from "../../../attributes";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface ReadAttributeRequestItemJSON extends RequestItemJSON {
    "@type": "ReadAttributeRequestItem";
    query: IdentityAttributeQueryJSON | RelationshipAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON | IQLQueryJSON;
}

export interface IReadAttributeRequestItem extends IRequestItem {
    query: IIdentityAttributeQuery | IRelationshipAttributeQuery | IThirdPartyRelationshipAttributeQuery | IIQLQuery;
}

@type("ReadAttributeRequestItem")
export class ReadAttributeRequestItem extends RequestItem implements IReadAttributeRequestItem {
    @serialize({
        unionTypes: [IdentityAttributeQuery, RelationshipAttributeQuery, ThirdPartyRelationshipAttributeQuery, IQLQuery]
    })
    @validate()
    public query: IdentityAttributeQuery | RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery | IQLQuery;

    public static from(value: IReadAttributeRequestItem | Omit<ReadAttributeRequestItemJSON, "@type"> | ReadAttributeRequestItemJSON): ReadAttributeRequestItem {
        return this.fromAny(value);
    }
}
