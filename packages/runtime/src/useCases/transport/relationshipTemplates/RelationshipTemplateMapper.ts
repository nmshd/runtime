import { Serializable } from "@js-soft/ts-serval";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { RelationshipTemplateDTO } from "@nmshd/runtime-types";
import { RelationshipTemplate } from "@nmshd/transport";
import { Container } from "@nmshd/typescript-ioc";
import { ConfigHolder } from "../../../ConfigHolder";
import { PasswordProtectionMapper } from "../../common";

export class RelationshipTemplateMapper {
    public static toRelationshipTemplateDTO(template: RelationshipTemplate): RelationshipTemplateDTO {
        const backboneBaseUrl = Container.get<ConfigHolder>(ConfigHolder).getConfig().transportLibrary.baseUrl;
        const reference = template.toRelationshipTemplateReference(backboneBaseUrl);

        return {
            id: template.id.toString(),
            isOwn: template.isOwn,
            createdBy: template.createdBy.toString(),
            createdByDevice: template.createdByDevice.toString(),
            createdAt: template.createdAt.toString(),
            forIdentity: template.forIdentity?.toString(),
            passwordProtection: PasswordProtectionMapper.toPasswordProtectionDTO(template.passwordProtection),
            content: this.toTemplateContent(template.content),
            expiresAt: template.expiresAt?.toString(),
            maxNumberOfAllocations: template.maxNumberOfAllocations,
            reference: {
                truncated: reference.truncate(),
                url: reference.toUrl()
            }
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
