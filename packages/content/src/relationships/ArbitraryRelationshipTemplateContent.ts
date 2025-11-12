import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";

export interface ArbitraryRelationshipTemplateContentJSON extends ContentJSON {
    "@type": "ArbitraryRelationshipTemplateContent";
    value: unknown;
}

export interface IArbitraryRelationshipTemplateContent extends ISerializable {
    value: unknown;
}

@type("ArbitraryRelationshipTemplateContent")
export class ArbitraryRelationshipTemplateContent extends Serializable implements IArbitraryRelationshipTemplateContent {
    @serialize({ any: true })
    @validate()
    public value: unknown;

    public static from(value: IArbitraryRelationshipTemplateContent | Omit<ArbitraryRelationshipTemplateContentJSON, "@type">): ArbitraryRelationshipTemplateContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ArbitraryRelationshipTemplateContentJSON {
        return super.toJSON(verbose, serializeAsString) as ArbitraryRelationshipTemplateContentJSON;
    }
}
