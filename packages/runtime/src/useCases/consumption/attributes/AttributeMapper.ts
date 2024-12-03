import { AttributeTag, AttributeTagCollection, LocalAttribute, LocalAttributeDeletionInfoJSON, LocalAttributeShareInfoJSON } from "@nmshd/consumption";
import { AttributeTagCollectionDTO, AttributeTagDTO, LocalAttributeDTO } from "../../../types";

export class AttributeMapper {
    public static toAttributeDTO(attribute: LocalAttribute): LocalAttributeDTO {
        return {
            id: attribute.id.toString(),
            parentId: attribute.parentId?.toString(),
            content: attribute.content.toJSON(),
            createdAt: attribute.createdAt.toString(),
            succeeds: attribute.succeeds?.toString(),
            succeededBy: attribute.succeededBy?.toString(),
            shareInfo: attribute.shareInfo?.toJSON() as LocalAttributeShareInfoJSON,
            deletionInfo: attribute.deletionInfo?.toJSON() as LocalAttributeDeletionInfoJSON,
            isDefault: attribute.isDefault
        };
    }

    public static toAttributeDTOList(attributes: LocalAttribute[]): LocalAttributeDTO[] {
        return attributes.map((attribute) => this.toAttributeDTO(attribute));
    }

    public static toAttributeTagCollectionDTO(tagList: AttributeTagCollection): AttributeTagCollectionDTO {
        return {
            supportedLanguages: tagList.supportedLanguages,
            tagsForAttributeValueTypes: Object.entries(tagList.tagsForAttributeValueTypes).reduce(
                (acc, [key, value]) => {
                    acc[key] = Object.entries(value).reduce(
                        (acc2, [key2, value2]) => {
                            acc2[key2] = AttributeMapper.toAttributeTagDTO(value2);
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
                    acc[key] = AttributeMapper.toAttributeTagDTO(value);
                    return acc;
                },
                {} as Record<string, AttributeTagDTO>
            );
        }
        return tagDTO;
    }
}
