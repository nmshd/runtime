import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";
import { IRequest, Request, RequestJSON } from "../requests/Request.js";

export interface RelationshipTemplateContentJSON extends ContentJSON {
    "@type": "RelationshipTemplateContent";
    title?: string;
    metadata?: object;
    onNewRelationship: RequestJSON;
    onExistingRelationship?: RequestJSON;
}

export interface IRelationshipTemplateContent extends ISerializable {
    title?: string;
    metadata?: object;
    onNewRelationship: IRequest;
    onExistingRelationship?: IRequest;
}

@type("RelationshipTemplateContent")
export class RelationshipTemplateContent extends Serializable implements IRelationshipTemplateContent {
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

    public static from(value: IRelationshipTemplateContent | Omit<RelationshipTemplateContentJSON, "@type">): RelationshipTemplateContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipTemplateContentJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipTemplateContentJSON;
    }
}
