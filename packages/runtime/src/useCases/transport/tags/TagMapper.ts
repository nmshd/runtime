import { BackboneTagList } from "@nmshd/transport/src/modules/tags/backbone/BackboneGetTag";
import { TagListDTO } from "../../../types/transport/TagDTO";

export class TagMapper {
    public static toTagListDTO(tagList: BackboneTagList): TagListDTO {
        return tagList;
    }
}
