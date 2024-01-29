import { IdentityAttributeQueryJSON, ThirdPartyRelationshipAttributeQueryJSON } from "@nmshd/content";

export interface LocalAttributeListenerDTO {
    id: string;
    query: IdentityAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON;
    peer: string;
}
