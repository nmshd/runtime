export interface BackboneTagList {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, BackboneTag>>;
}

interface BackboneTag {
    displayNames: Record<string, string>;
    children?: Record<string, BackboneTag>;
}
