import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { ArbitraryRelationshipCreationContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";
import { CreateRelationshipRequest } from "./CreateRelationship";

export type CanCreateRelationshipResponse = CanCreateRelationshipSuccessResponse | CanCreateRelationshipFailureResponse;

export interface CanCreateRelationshipSuccessResponse {
    isSuccess: true;
}

export interface CanCreateRelationshipFailureResponse {
    isSuccess: false;
    code: string;
    message: string;
}

export class CanCreateRelationshipUseCase extends UseCase<CreateRelationshipRequest, CanCreateRelationshipResponse> {
    public constructor(
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject private readonly incomingRequestsController: IncomingRequestsController
    ) {
        super();
    }

    protected async executeInternal(request: CreateRelationshipRequest): Promise<Result<CanCreateRelationshipResponse>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));

        if (!template) {
            const error = RuntimeErrors.general.recordNotFound(RelationshipTemplate);
            return Result.ok({ isSuccess: false, code: error.code, message: error.message } as CanCreateRelationshipFailureResponse);
        }

        if (!template.cache) {
            const error = RuntimeErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString());
            return Result.ok({ isSuccess: false, code: error.code, message: error.message } as CanCreateRelationshipFailureResponse);
        }

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);
        if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
            const error = RuntimeErrors.general.invalidPropertyValue(
                "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
            );
            return Result.ok({ isSuccess: false, code: error.code, message: error.message } as CanCreateRelationshipFailureResponse);
        }

        const canSendRelationship = await this.relationshipController.canSendRelationship({ creationContent: request.creationContent, template });

        if (!canSendRelationship.isSuccess) {
            if (canSendRelationship.error.code === "error.transport.relationships.relationshipTemplateIsExpired") {
                if (template.cache.content instanceof RelationshipTemplateContent && template.cache.expiresAt) {
                    const dbQuery: any = {};
                    dbQuery["source.reference"] = { $eq: template.id.toString() };
                    await this.incomingRequestsController.getIncomingRequests(dbQuery);
                }
            }

            const errorResponse: CanCreateRelationshipFailureResponse = {
                isSuccess: false,
                code: canSendRelationship.error.code,
                message: canSendRelationship.error.reason
            };

            return Result.ok(errorResponse);
        }

        const successResponse: CanCreateRelationshipSuccessResponse = { isSuccess: true };
        return Result.ok(successResponse);
    }
}
