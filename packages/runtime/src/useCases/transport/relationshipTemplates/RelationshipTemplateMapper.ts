import { Serializable } from "@js-soft/ts-serval";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { RelationshipTemplate } from "@nmshd/transport";
import { RelationshipTemplateDTO } from "../../../types";
import { RuntimeErrors } from "../../common";

export class RelationshipTemplateMapper {
    public static toRelationshipTemplateDTO(template: RelationshipTemplate): RelationshipTemplateDTO {
        if (!template.cache) {
            throw RuntimeErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString());
        }

        return {
            id: template.id.toString(),
            isOwn: template.isOwn,
            createdBy: template.cache.createdBy.toString(),
            createdByDevice: template.cache.createdByDevice.toString(),
            createdAt: template.cache.createdAt.toString(),
            forIdentity: template.cache.forIdentity?.toString(),
            passwordProtection: template.passwordProtection
                ? {
                      password: template.passwordProtection.password,
                      passwordIsPin: template.passwordProtection.passwordType.startsWith("pin") ? true : undefined,
                      passwordLocationIndicator: Number(template.passwordProtection.passwordLocationIndicator)
                  }
                : undefined,
            content: this.toTemplateContent(template.cache.content),
            expiresAt: template.cache.expiresAt?.toString(),
            maxNumberOfAllocations: template.cache.maxNumberOfAllocations,
            truncatedReference: template.truncate()
        };
    }

    public static toRelationshipTemplateDTOList(responseItems: RelationshipTemplate[]): RelationshipTemplateDTO[] {
        return responseItems.map((i) => this.toRelationshipTemplateDTO(i));
    }

    private static toTemplateContent(content: Serializable) {
        if (!(content instanceof RelationshipTemplateContent || content instanceof ArbitraryRelationshipTemplateContent)) {
            return ArbitraryRelationshipTemplateContent.from({ value: content }).toJSON();
        }
        return content.toJSON();
    }
}
