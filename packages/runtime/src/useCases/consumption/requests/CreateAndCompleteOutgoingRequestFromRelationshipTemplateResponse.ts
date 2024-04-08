import { ApplicationError, Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { Response, ResponseJSON } from "@nmshd/content";
import { CoreDate, CoreId, MessageController, Relationship, RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { MessageIdString, RelationshipIdString, RelationshipTemplateIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest {
    templateId: RelationshipTemplateIdString;
    responseSourceId: RelationshipIdString | MessageIdString;
    response: ResponseJSON;
}

export class CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseUseCase extends UseCase<
    CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest,
    LocalRequestDTO
> {
    public constructor(
        @Inject private readonly outgoingRequestsController: OutgoingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject private readonly messageController: MessageController
    ) {
        super();
    }

    protected async executeInternal(request: CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));
        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        const responseSource = await this.getResponseSource(request.responseSourceId);
        let responseCreationDate: CoreDate | undefined;
        if (request.responseSourceId.startsWith("REL")) {
            responseCreationDate = (await this.relationshipController.getAuditLog(CoreId.from(request.responseSourceId)))[0].createdAt;
        }
        if (!responseSource) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship)); // TODO: assess if Relationship is correct
        }

        const localRequest = await this.outgoingRequestsController.createAndCompleteFromRelationshipTemplateResponse({
            template,
            responseSource,
            response: Response.from(request.response),
            responseCreationDate: responseCreationDate
        });

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }

    private async getResponseSource(responseSourceId: string) {
        if (responseSourceId.startsWith("MSG")) return await this.messageController.getMessage(CoreId.from(responseSourceId));

        return await this.relationshipController.getRelationship(CoreId.from(responseSourceId));
    }
}
