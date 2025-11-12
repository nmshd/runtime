import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";

export interface ArbitraryRelationshipCreationContentJSON extends ContentJSON {
    "@type": "ArbitraryRelationshipCreationContent";
    value: unknown;
}

export interface IArbitraryRelationshipCreationContent extends ISerializable {
    value: unknown;
}

@type("ArbitraryRelationshipCreationContent")
export class ArbitraryRelationshipCreationContent extends Serializable implements IArbitraryRelationshipCreationContent {
    @serialize({ any: true })
    @validate()
    public value: unknown;

    public static from(value: IArbitraryRelationshipCreationContent | Omit<ArbitraryRelationshipCreationContentJSON, "@type">): ArbitraryRelationshipCreationContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ArbitraryRelationshipCreationContentJSON {
        return super.toJSON(verbose, serializeAsString) as ArbitraryRelationshipCreationContentJSON;
    }
}
