import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";

@type("TagList")
export class TagList extends Serializable {
    @serialize({ type: String })
    @validate()
    public supportedLanguages: string[];

    @serialize()
    @validate()
    public tagsForAttributeValueTypes: Record<string, Record<string, Tag>>;
}

@type("Tag")
export class Tag extends Serializable {
    @serialize()
    @validate()
    public displayNames: Record<string, string>;

    @serialize()
    @validate({ nullable: true })
    public children?: Record<string, Tag>;
}
