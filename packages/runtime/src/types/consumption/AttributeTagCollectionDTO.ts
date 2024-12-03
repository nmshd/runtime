export interface AttributeTagCollectionDTO {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, AttributeTagDTO>>;
}

export interface AttributeTagDTO {
    displayNames: Record<string, string>;
    children?: Record<string, AttributeTagDTO>;
}
