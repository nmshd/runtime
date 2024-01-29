import { ResponseResult } from "@nmshd/content";
import { DataViewObject } from "../DataViewObject";
import { ResponseItemDVO, ResponseItemGroupDVO } from "./ResponseItemDVOs";

export interface ResponseDVO extends DataViewObject {
    type: "ResponseDVO";
    items: (ResponseItemGroupDVO | ResponseItemDVO)[];
    result: ResponseResult;
}
