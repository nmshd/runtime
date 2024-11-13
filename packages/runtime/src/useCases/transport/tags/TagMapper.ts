import { TagList } from "@nmshd/transport/src/modules/tags/data/TagList";
import { TagListDTO } from "../../../types/transport/TagDTO";

export class TagMapper {
    public static toTagListDTO(tagList: TagList): TagListDTO {
        return tagList;
    }
}
