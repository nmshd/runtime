export interface BackboneGetAttributeTagCollection {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, BackboneGetAttributeTag>>;
}

interface BackboneGetAttributeTag {
    displayNames: Record<string, string>;
    children?: Record<string, BackboneGetAttributeTag>;
}
