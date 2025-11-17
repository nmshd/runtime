import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { IResponse, Response, ResponseJSON } from "./response/index.js";

export interface ResponseWrapperJSON {
    "@type": "ResponseWrapper";
    requestId: string;
    requestSourceReference: string;
    requestSourceType: "RelationshipTemplate" | "Message";
    response: ResponseJSON;
}

export interface IResponseWrapper extends ISerializable {
    requestId: CoreId;
    requestSourceReference: CoreId;
    requestSourceType: "RelationshipTemplate" | "Message";
    response: IResponse;
}

@type("ResponseWrapper")
export class ResponseWrapper extends Serializable implements IResponseWrapper {
    @serialize()
    @validate()
    public requestId: CoreId;

    @serialize()
    @validate()
    public requestSourceReference: CoreId;

    @serialize()
    @validate({ allowedValues: ["RelationshipTemplate", "Message"] })
    public requestSourceType: "RelationshipTemplate" | "Message";

    @serialize()
    @validate()
    public response: Response;

    public static from(value: IResponseWrapper | ResponseWrapperJSON): ResponseWrapper {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ResponseWrapperJSON {
        return super.toJSON(verbose, serializeAsString) as ResponseWrapperJSON;
    }
}
