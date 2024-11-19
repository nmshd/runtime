import { PublicRelationshipTemplateReference } from "@nmshd/transport";
import { PublicRelationshipTemplateReferenceDTO } from "../../../types/transport/PublicRelationshipTemplateReferenceDTO";

export class PublicRelationshipTemplateReferenceMapper {
    public static toPublicRelationshipTemplateReferenceDTO(tagList: PublicRelationshipTemplateReference): PublicRelationshipTemplateReferenceDTO {
        return tagList;
    }
}
