import { ResponseResult } from "@nmshd/content";
import { DataViewObject } from "../DataViewObject.js";
import { ResponseItemDVO, ResponseItemGroupDVO } from "./ResponseItemDVOs.js";

export interface ResponseDVO extends DataViewObject {
    type: "ResponseDVO";
    items: (ResponseItemGroupDVO | ResponseItemDVO)[];
    result: ResponseResult;
}
