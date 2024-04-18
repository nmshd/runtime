import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import { IResponse, Response, ResponseJSON } from "../requests/response/Response";

export interface RelationshipCreationChangeRequestContentJSON extends ContentJSON {
    "@type": "RelationshipCreationChangeRequestContent";
    response: ResponseJSON;
}

export interface IRelationshipCreationChangeRequestContent extends ISerializable {
    response: IResponse;
}

@type("RelationshipCreationChangeRequestContent")
export class RelationshipCreationChangeRequestContent extends Serializable implements IRelationshipCreationChangeRequestContent {
    @serialize()
    @validate()
    public response: Response;

    public static from(value: IRelationshipCreationChangeRequestContent | Omit<RelationshipCreationChangeRequestContentJSON, "@type">): RelationshipCreationChangeRequestContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipCreationChangeRequestContentJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipCreationChangeRequestContentJSON;
    }
}
