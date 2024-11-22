export interface TagListDTO {
    supportedLanguages: string[];
    tagsForAttributeValueTypes: Record<string, Record<string, TagDTO>>;
}

export interface TagDTO {
    displayNames: Record<string, string>;
    children?: Record<string, TagDTO>;
}
