import { DataViewObject } from "../DataViewObject.js";
import { RequestItemDVO, RequestItemGroupDVO } from "./RequestItemDVOs.js";
import { ResponseDVO } from "./ResponseDVO.js";

export interface RequestDVO extends DataViewObject {
    type: "RequestDVO";
    expiresAt?: string;
    items: (RequestItemGroupDVO | RequestItemDVO)[];
    response?: ResponseDVO;
}
