import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";

export interface ArbitraryMessageContentJSON extends ContentJSON {
    "@type": "ArbitraryMessageContent";
    content: any;
}
export interface IArbitraryMessageContent extends ISerializable {
    content: any;
}

@type("ArbitraryMessageContent")
export class ArbitraryMessageContent extends Serializable implements IArbitraryMessageContent {
    @serialize()
    @validate()
    public content: any;

    public static from(value: IArbitraryMessageContent | Omit<ArbitraryMessageContentJSON, "@type">): ArbitraryMessageContent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ArbitraryMessageContentJSON {
        return super.toJSON(verbose, serializeAsString) as ArbitraryMessageContentJSON;
    }
}
