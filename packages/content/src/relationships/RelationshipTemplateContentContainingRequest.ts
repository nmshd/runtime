import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import { IRequest, Request, RequestJSON } from "../requests/Request";

export interface RelationshipTemplateContentContainingRequestJSON extends ContentJSON {
    "@type": "RelationshipTemplateContentContainingRequest";
    title?: string;
    metadata?: object;
    onNewRelationship: RequestJSON;
    onExistingRelationship?: RequestJSON;
}

export interface IRelationshipTemplateContentContainingRequest extends ISerializable {
    title?: string;
    metadata?: object;
    onNewRelationship: IRequest;
    onExistingRelationship?: IRequest;
}

@type("RelationshipTemplateContentContainingRequest")
export class RelationshipTemplateContentContainingRequest extends Serializable implements IRelationshipTemplateContentContainingRequest {
    @serialize()
    @validate({ nullable: true, max: 200 })
    public title?: string;

    @serialize()
    @validate({ nullable: true })
    public metadata?: object;

    @serialize()
    @validate()
    public onNewRelationship: Request;

    @serialize()
    @validate({ nullable: true })
    public onExistingRelationship?: Request;

    public static from(
        value: IRelationshipTemplateContentContainingRequest | Omit<RelationshipTemplateContentContainingRequestJSON, "@type">
    ): RelationshipTemplateContentContainingRequest {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipTemplateContentContainingRequestJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipTemplateContentContainingRequestJSON;
    }
}
