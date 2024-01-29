import { IdentityAttributeQueryDVO, ThirdPartyRelationshipAttributeQueryDVO } from "../content";
import { DataViewObject } from "../DataViewObject";
import { IdentityDVO } from "../transport";

/**
 * The DataViewObject representation of a LocalAttributeListener
 */
export interface LocalAttributeListenerDVO extends DataViewObject {
    type: "LocalAttributeListenerDVO";
    query: IdentityAttributeQueryDVO | ThirdPartyRelationshipAttributeQueryDVO;
    peer: IdentityDVO;
}
