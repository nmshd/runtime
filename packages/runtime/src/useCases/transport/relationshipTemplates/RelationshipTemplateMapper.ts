import { Serializable } from "@js-soft/ts-serval";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { RelationshipTemplate } from "@nmshd/transport";
import { RelationshipTemplateDTO } from "../../../types";
import { PasswordProtectionMapper, RuntimeErrors } from "../../common";

export class RelationshipTemplateMapper {
    public constructor(private readonly backboneBaseUrl: string) {}

    public toRelationshipTemplateDTO(template: RelationshipTemplate): RelationshipTemplateDTO {
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
            passwordProtection: PasswordProtectionMapper.toPasswordProtectionDTO(template.passwordProtection),
            content: this.toTemplateContent(template.cache.content),
            expiresAt: template.cache.expiresAt?.toString(),
            maxNumberOfAllocations: template.cache.maxNumberOfAllocations,
            truncatedReference: template.truncate(this.backboneBaseUrl),
            url: template.toRelationshipTemplateReference(this.backboneBaseUrl).toUrl()
        };
    }

    public toRelationshipTemplateDTOList(responseItems: RelationshipTemplate[]): RelationshipTemplateDTO[] {
        return responseItems.map((i) => this.toRelationshipTemplateDTO(i));
    }

    private toTemplateContent(content: Serializable) {
        if (!(content instanceof RelationshipTemplateContent || content instanceof ArbitraryRelationshipTemplateContent)) {
            return ArbitraryRelationshipTemplateContent.from({ value: content }).toJSON();
        }
        return content.toJSON();
    }
}
