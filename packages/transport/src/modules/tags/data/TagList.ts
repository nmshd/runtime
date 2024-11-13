import { Serializable, serialize, validate } from "@js-soft/ts-serval";

export class TagList extends Serializable {
    @serialize()
    @validate()
    public supportedLanguages: string[];

    @serialize()
    @validate()
    public tagsForAttributeValueTypes: Record<string, Record<string, Tag>>;
}

export class Tag extends Serializable {
    @serialize()
    @validate()
    public displayNames: Record<string, string>;

    @serialize()
    @validate({ nullable: true })
    public children?: Record<string, Tag>;
}
