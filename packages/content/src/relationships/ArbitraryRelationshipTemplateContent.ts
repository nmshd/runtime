import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";

export interface ArbitraryRelationshipTemplateContentJSON extends ContentJSON {
    "@type": "ArbitraryRelationshipTemplateContent";
    content: any;
}
export interface IArbitraryRelationshipTemplateContent extends ISerializable {
    content: any;
}

@type("ArbitraryRelationshipTemplateContent")
export class ArbitraryRelationshipTemplateContent extends Serializable implements IArbitraryRelationshipTemplateContent {
    @serialize()
    @validate()
    public content: any;

    public static from(value: IArbitraryRelationshipTemplateContent | Omit<ArbitraryRelationshipTemplateContentJSON, "@type">): ArbitraryRelationshipTemplateContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ArbitraryRelationshipTemplateContentJSON {
        return super.toJSON(verbose, serializeAsString) as ArbitraryRelationshipTemplateContentJSON;
    }
}
