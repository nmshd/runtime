import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError } from "@js-soft/ts-utils";
import { ArbitraryRelationshipCreationContent, ArbitraryRelationshipTemplateContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { RelationshipTemplate } from "@nmshd/transport";
import { RuntimeErrors } from "../../../common";

export function validateTypeOfCreationContentOfRelationship(template: RelationshipTemplate, creationContent: any): ApplicationError | undefined {
    const transformedCreationContent = Serializable.fromUnknown(creationContent);
    if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
        return RuntimeErrors.general.invalidPropertyValue(
            "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
        );
    }

    if (template.cache?.content instanceof ArbitraryRelationshipTemplateContent && !(transformedCreationContent instanceof ArbitraryRelationshipCreationContent)) {
        return RuntimeErrors.general.invalidPropertyValue(
            "The creationContent of a Relationship must be an ArbitraryRelationshipCreationContent if the content of the RelationshipTemplate is an ArbitraryRelationshipTemplateContent."
        );
    }

    if (template.cache?.content instanceof RelationshipTemplateContent && !(transformedCreationContent instanceof RelationshipCreationContent)) {
        return RuntimeErrors.general.invalidPropertyValue(
            "The creationContent of a Relationship must be a RelationshipCreationContent if the content of the RelationshipTemplate is a RelationshipTemplateContent."
        );
    }

    return;
}
