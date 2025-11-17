import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { ArbitraryRelationshipCreationContent, ArbitraryRelationshipTemplateContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { RelationshipTemplate } from "@nmshd/transport";
import { RelationshipTemplateIdString, RuntimeErrors } from "../../../common/index.js";

export async function validateCreationContentOfRelationship(
    incomingRequestsController: IncomingRequestsController,
    template: RelationshipTemplate,
    creationContent: any
): Promise<ApplicationError | undefined> {
    const transformedCreationContent = Serializable.fromUnknown(creationContent);
    if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
        return RuntimeErrors.general.invalidPropertyValue(
            "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
        );
    }

    if (template.content instanceof ArbitraryRelationshipTemplateContent && !(transformedCreationContent instanceof ArbitraryRelationshipCreationContent)) {
        return RuntimeErrors.general.invalidPropertyValue(
            "The creationContent of a Relationship must be an ArbitraryRelationshipCreationContent if the content of the RelationshipTemplate is an ArbitraryRelationshipTemplateContent."
        );
    }

    if (template.content instanceof RelationshipTemplateContent) {
        if (!(transformedCreationContent instanceof RelationshipCreationContent)) {
            return RuntimeErrors.general.invalidPropertyValue(
                "The creationContent of a Relationship must be a RelationshipCreationContent if the content of the RelationshipTemplate is a RelationshipTemplateContent."
            );
        }

        const responseToRequestOfTemplateValidationError = await validateResponseToRequestOfTemplate(
            incomingRequestsController,
            template.id.toString(),
            transformedCreationContent
        );
        if (responseToRequestOfTemplateValidationError) return responseToRequestOfTemplateValidationError;
    }

    return;
}

async function validateResponseToRequestOfTemplate(
    incomingRequestsController: IncomingRequestsController,
    templateId: RelationshipTemplateIdString,
    relationshipCreationContent: RelationshipCreationContent
): Promise<ApplicationError | undefined> {
    const acceptedIncomingRequests = await incomingRequestsController.getIncomingRequests({
        status: LocalRequestStatus.Decided,
        "source.reference": templateId,
        "response.content.result": "Accepted"
    });

    if (acceptedIncomingRequests.length === 0) {
        return RuntimeErrors.relationships.noAcceptedIncomingRequest();
    }

    if (acceptedIncomingRequests[0].response!.content.serialize() !== relationshipCreationContent.response.serialize()) {
        return RuntimeErrors.relationships.wrongResponseProvidedAsCreationContent();
    }

    return;
}
