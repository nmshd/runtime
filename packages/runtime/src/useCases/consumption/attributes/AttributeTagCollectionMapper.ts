import { AttributeTag, AttributeTagCollection } from "@nmshd/consumption";
import { AttributeTagCollectionDTO, AttributeTagDTO } from "@nmshd/runtime-types";

export class AttributeTagCollectionMapper {
    public static toAttributeTagCollectionDTO(tagList: AttributeTagCollection): AttributeTagCollectionDTO {
        return {
            supportedLanguages: tagList.supportedLanguages,
            tagsForAttributeValueTypes: Object.entries(tagList.tagsForAttributeValueTypes).reduce(
                (acc, [key, value]) => {
                    acc[key] = Object.entries(value).reduce(
                        (acc2, [key2, value2]) => {
                            acc2[key2] = AttributeTagCollectionMapper.toAttributeTagDTO(value2);
                            return acc2;
                        },
                        {} as Record<string, AttributeTagDTO>
                    );
                    return acc;
                },
                {} as Record<string, Record<string, AttributeTagDTO>>
            )
        };
    }

    public static toAttributeTagDTO(tagListDTO: AttributeTag): AttributeTagDTO {
        const tagDTO: AttributeTagDTO = {
            displayNames: tagListDTO.displayNames
        };
        if (tagListDTO.children) {
            tagDTO.children = Object.entries(tagListDTO.children).reduce(
                (acc, [key, value]) => {
                    acc[key] = AttributeTagCollectionMapper.toAttributeTagDTO(value);
                    return acc;
                },
                {} as Record<string, AttributeTagDTO>
            );
        }
        return tagDTO;
    }
}
