import { DataViewObject } from "../DataViewObject";
import { RequestItemDVO, RequestItemGroupDVO } from "./RequestItemDVOs";
import { ResponseDVO } from "./ResponseDVO";

export interface RequestDVO extends DataViewObject {
    type: "RequestDVO";
    expiresAt?: string;
    items: (RequestItemGroupDVO | RequestItemDVO)[];
    response?: ResponseDVO;
}
