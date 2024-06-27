import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import { IResponse, Response, ResponseJSON } from "../requests/response/Response";

export interface RelationshipCreationContentContainingResponseJSON extends ContentJSON {
    "@type": "RelationshipCreationContentContainingResponse";
    response: ResponseJSON;
}

export interface IRelationshipCreationContentContainingResponse extends ISerializable {
    response: IResponse;
}

@type("RelationshipCreationContentContainingResponse")
export class RelationshipCreationContentContainingResponse extends Serializable implements IRelationshipCreationContentContainingResponse {
    @serialize()
    @validate()
    public response: Response;

    public static from(
        value: IRelationshipCreationContentContainingResponse | Omit<RelationshipCreationContentContainingResponseJSON, "@type">
    ): RelationshipCreationContentContainingResponse {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipCreationContentContainingResponseJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipCreationContentContainingResponseJSON;
    }
}
