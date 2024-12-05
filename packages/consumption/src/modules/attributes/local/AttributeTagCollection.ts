import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";

export interface IAttributeTagCollection {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, IAttributeTag>>;
}

export interface IAttributeTag {
    displayNames: Record<string, string>;
    children?: Record<string, IAttributeTag>;
}

@type("AttributeTagCollection")
export class AttributeTagCollection extends Serializable implements IAttributeTagCollection {
    @serialize({ type: String })
    @validate()
    public supportedLanguages: string[];

    @serialize()
    @validate()
    public tagsForAttributeValueTypes: Record<string, Record<string, AttributeTag>>;

    public static from(value: IAttributeTagCollection): AttributeTagCollection {
        return this.fromAny(value);
    }
}

@type("AttributeTag")
export class AttributeTag extends Serializable implements IAttributeTag {
    @serialize()
    @validate()
    public displayNames: Record<string, string>;

    @serialize()
    @validate({ nullable: true })
    public children?: Record<string, AttributeTag>;
}
