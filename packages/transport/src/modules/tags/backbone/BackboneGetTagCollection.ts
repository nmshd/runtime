export interface BackboneGetTagCollection {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, BackboneGetTag>>;
}

interface BackboneGetTag {
    displayNames: Record<string, string>;
    children?: Record<string, BackboneGetTag>;
}
