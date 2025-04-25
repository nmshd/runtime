import { Serializable } from "@js-soft/ts-serval";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { PasswordProtection, RelationshipTemplate } from "@nmshd/transport";
import { RelationshipTemplateDTO } from "../../../types";
import { mapNumberToPasswordLocationIndicatorString, PasswordLocationIndicator, RuntimeErrors } from "../../common";

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
            passwordProtection: this.toPasswordProtection(template.passwordProtection),
            content: this.toTemplateContent(template.cache.content),
            expiresAt: template.cache.expiresAt?.toString(),
            maxNumberOfAllocations: template.cache.maxNumberOfAllocations,
            truncatedReference: template.truncate()
        };
    }

    public static toRelationshipTemplateDTOList(responseItems: RelationshipTemplate[]): RelationshipTemplateDTO[] {
        return responseItems.map((i) => this.toRelationshipTemplateDTO(i));
    }

    private static toPasswordProtection(
        passwordProtection?: PasswordProtection
    ): { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator } | undefined {
        if (!passwordProtection) {
            return undefined;
        }

        const passwordIsPin = passwordProtection.passwordType.startsWith("pin") ? true : undefined;
        const passwordLocationIndicator = passwordProtection.passwordLocationIndicator
            ? mapNumberToPasswordLocationIndicatorString(passwordProtection.passwordLocationIndicator)
            : undefined;

        return {
            password: passwordProtection.password,
            passwordIsPin,
            passwordLocationIndicator
        };
    }

    private static toTemplateContent(content: Serializable) {
        if (!(content instanceof RelationshipTemplateContent || content instanceof ArbitraryRelationshipTemplateContent)) {
            return ArbitraryRelationshipTemplateContent.from({ value: content }).toJSON();
        }
        return content.toJSON();
    }
}
