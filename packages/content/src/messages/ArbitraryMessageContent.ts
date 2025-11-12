import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";

export interface ArbitraryMessageContentJSON extends ContentJSON {
    "@type": "ArbitraryMessageContent";
    value: unknown;
}

export interface IArbitraryMessageContent extends ISerializable {
    value: unknown;
}

@type("ArbitraryMessageContent")
export class ArbitraryMessageContent extends Serializable implements IArbitraryMessageContent {
    @serialize({ any: true })
    @validate()
    public value: unknown;

    public static from(value: IArbitraryMessageContent | Omit<ArbitraryMessageContentJSON, "@type">): ArbitraryMessageContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ArbitraryMessageContentJSON {
        return super.toJSON(verbose, serializeAsString) as ArbitraryMessageContentJSON;
    }
}
