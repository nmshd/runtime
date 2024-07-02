import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { RelationshipTemplate } from "@nmshd/transport";
import { RelationshipTemplateDTO } from "../../../types";
import { RuntimeErrors } from "../../common";

export class RelationshipTemplateMapper {
    public static toRelationshipTemplateDTO(template: RelationshipTemplate): RelationshipTemplateDTO {
        if (!template.cache) {
            throw RuntimeErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString());
        }
        if (!(template.cache.content instanceof RelationshipTemplateContent || template.cache.content instanceof ArbitraryRelationshipTemplateContent)) {
            throw RuntimeErrors.general.invalidPropertyValue(
                `The content type of relationship template ${template.id} is neither RelationshipTemplateContent nor ArbitraryRelationshipTemplateContent.`
            );
        }

        return {
            id: template.id.toString(),
            isOwn: template.isOwn,
            createdBy: template.cache.createdBy.toString(),
            createdByDevice: template.cache.createdByDevice.toString(),
            createdAt: template.cache.createdAt.toString(),
            content: template.cache.content.toJSON(),
            expiresAt: template.cache.expiresAt?.toString(),
            maxNumberOfAllocations: template.cache.maxNumberOfAllocations,
            secretKey: template.secretKey.toBase64(false),
            truncatedReference: template.truncate()
        };
    }

    public static toRelationshipTemplateDTOList(responseItems: RelationshipTemplate[]): RelationshipTemplateDTO[] {
        return responseItems.map((i) => this.toRelationshipTemplateDTO(i));
    }
}
