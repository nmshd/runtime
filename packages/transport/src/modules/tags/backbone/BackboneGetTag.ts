export interface BackboneGetTag {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, Tag>>;
}

interface Tag {
    displayNames: Record<string, string>;
    children?: Record<string, Tag>;
}
