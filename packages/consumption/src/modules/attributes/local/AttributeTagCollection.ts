import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";

@type("AttributeTagCollection")
export class AttributeTagCollection extends Serializable {
    @serialize({ type: String })
    @validate()
    public supportedLanguages: string[];

    @serialize()
    @validate()
    public tagsForAttributeValueTypes: Record<string, Record<string, AttributeTag>>;
}

@type("AttributeTag")
export class AttributeTag extends Serializable {
    @serialize()
    @validate()
    public displayNames: Record<string, string>;

    @serialize()
    @validate({ nullable: true })
    public children?: Record<string, AttributeTag>;
}
