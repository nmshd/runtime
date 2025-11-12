import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../../ContentJSON.js";
import { AcceptResponseItemDerivations, AcceptResponseItemJSONDerivations, IAcceptResponseItemDerivations } from "./AcceptResponseItem.js";
import { ErrorResponseItemDerivations, ErrorResponseItemJSONDerivations, IErrorResponseItemDerivations } from "./ErrorResponseItem.js";
import { IRejectResponseItemDerivations, RejectResponseItemDerivations, RejectResponseItemJSONDerivations } from "./RejectResponseItem.js";
import { ResponseItemResult } from "./ResponseItemResult.js";

export interface ResponseItemJSON extends ContentJSON {
    result: ResponseItemResult;
}

export type ResponseItemJSONDerivations = AcceptResponseItemJSONDerivations | RejectResponseItemJSONDerivations | ErrorResponseItemJSONDerivations;

export interface IResponseItem extends ISerializable {
    result: ResponseItemResult;
}

export type IResponseItemDerivations = IAcceptResponseItemDerivations | IRejectResponseItemDerivations | IErrorResponseItemDerivations;

export abstract class ResponseItem extends Serializable {
    @serialize()
    @validate()
    public result: ResponseItemResult;

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as ResponseItemJSON;
    }
}

export type ResponseItemDerivations = AcceptResponseItemDerivations | RejectResponseItemDerivations | ErrorResponseItemDerivations;
