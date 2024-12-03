export interface BackboneAttributeTagCollection {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, BackboneAttributeTag>>;
}

interface BackboneAttributeTag {
    displayNames: Record<string, string>;
    children?: Record<string, BackboneAttributeTag>;
}
