import { PublicRelationshipTemplateReference } from "@nmshd/transport";
import { PublicRelationshipTemplateReferenceDTO } from "../../../types/transport/PublicRelationshipTemplateReferenceDTO";

export class PublicRelationshipTemplateReferenceMapper {
    public static toPublicRelationshipTemplateReferenceDTO(publicRelationshipTemplateReference: PublicRelationshipTemplateReference): PublicRelationshipTemplateReferenceDTO {
        return {
            title: publicRelationshipTemplateReference.title,
            description: publicRelationshipTemplateReference.description,
            truncatedReference: publicRelationshipTemplateReference.truncatedReference
        };
    }
}
