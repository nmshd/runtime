import { PublicRelationshipTemplateReference } from "@nmshd/transport";
import { PublicRelationshipTemplateReferenceDTO } from "../../../types/transport/PublicRelationshipTemplateReferenceDTO";

export class PublicRelationshipTemplateReferenceMapper {
    public static toPublicRelationshipTemplateReferencDTO(tagList: PublicRelationshipTemplateReference): PublicRelationshipTemplateReferenceDTO {
        return tagList;
    }
}
