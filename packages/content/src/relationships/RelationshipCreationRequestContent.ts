import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import { IResponse, Response, ResponseJSON } from "../requests/response/Response";

export interface RelationshipCreationRequestContentJSON extends ContentJSON {
    "@type": "RelationshipCreationRequestContent";
    response: ResponseJSON;
}

export interface IRelationshipCreationRequestContent extends ISerializable {
    response: IResponse;
}

@type("RelationshipCreationRequestContent")
export class RelationshipCreationRequestContent extends Serializable implements IRelationshipCreationRequestContent {
    @serialize()
    @validate()
    public response: Response;

    public static from(value: IRelationshipCreationRequestContent | Omit<RelationshipCreationRequestContentJSON, "@type">): RelationshipCreationRequestContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipCreationRequestContentJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipCreationRequestContentJSON;
    }
}
