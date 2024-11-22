import { Tag, TagList } from "@nmshd/transport";
import { TagDTO, TagListDTO } from "../../../types";

export class TagMapper {
    public static toTagListDTO(tagList: TagList): TagListDTO {
        return {
            supportedLanguages: tagList.supportedLanguages,
            tagsForAttributeValueTypes: Object.entries(tagList.tagsForAttributeValueTypes).reduce(
                (acc, [key, value]) => {
                    acc[key] = Object.entries(value).reduce(
                        (acc2, [key2, value2]) => {
                            acc2[key2] = TagMapper.toTagDTO(value2);
                            return acc2;
                        },
                        {} as Record<string, TagDTO>
                    );
                    return acc;
                },
                {} as Record<string, Record<string, TagDTO>>
            )
        };
    }

    public static toTagDTO(tagListDTO: Tag): TagDTO {
        const tagDTO: TagDTO = {
            displayNames: tagListDTO.displayNames
        };
        if (tagListDTO.children) {
            tagDTO.children = Object.entries(tagListDTO.children).reduce(
                (acc, [key, value]) => {
                    acc[key] = TagMapper.toTagDTO(value);
                    return acc;
                },
                {} as Record<string, TagDTO>
            );
        }
        return tagDTO;
    }
}
