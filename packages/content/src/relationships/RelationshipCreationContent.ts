import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";
import { IResponse, Response, ResponseJSON } from "../requests/response/Response.js";

export interface RelationshipCreationContentJSON extends ContentJSON {
    "@type": "RelationshipCreationContent";
    response: ResponseJSON;
}

export interface IRelationshipCreationContent extends ISerializable {
    response: IResponse;
}

@type("RelationshipCreationContent")
export class RelationshipCreationContent extends Serializable implements IRelationshipCreationContent {
    @serialize()
    @validate()
    public response: Response;

    public static from(value: IRelationshipCreationContent | Omit<RelationshipCreationContentJSON, "@type">): RelationshipCreationContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipCreationContentJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipCreationContentJSON;
    }
}
