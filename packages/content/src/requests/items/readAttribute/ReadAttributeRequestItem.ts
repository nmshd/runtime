import { serialize, type, validate } from "@js-soft/ts-serval";
import {
    DCQLQuery,
    DCQLQueryJSON,
    IDCQLQuery,
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
    query: IdentityAttributeQueryJSON | RelationshipAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON | IQLQueryJSON | DCQLQueryJSON;
}

export interface IReadAttributeRequestItem extends IRequestItem {
    query: IIdentityAttributeQuery | IRelationshipAttributeQuery | IThirdPartyRelationshipAttributeQuery | IIQLQuery | IDCQLQuery;
}

@type("ReadAttributeRequestItem")
export class ReadAttributeRequestItem extends RequestItem implements IReadAttributeRequestItem {
    @serialize({
        unionTypes: [IdentityAttributeQuery, RelationshipAttributeQuery, ThirdPartyRelationshipAttributeQuery, IQLQuery, DCQLQuery]
    })
    @validate()
    public query: IdentityAttributeQuery | RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery | IQLQuery | DCQLQuery;

    public static from(value: IReadAttributeRequestItem | Omit<ReadAttributeRequestItemJSON, "@type"> | ReadAttributeRequestItemJSON): ReadAttributeRequestItem {
        return this.fromAny(value);
    }
}
