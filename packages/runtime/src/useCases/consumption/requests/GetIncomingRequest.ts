import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { RequestIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface GetIncomingRequestRequest {
    id: RequestIdString;
}

export class GetIncomingRequestUseCase extends UseCase<GetIncomingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: GetIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.id));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        if (localRequest.source?.type === "RelationshipTemplate") {
            const template = await this.relationshipTemplateController.getRelationshipTemplate(localRequest.source.reference);

            if (!template) {
                return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
            }

            const existingRelationshipsToPeer = await this.relationshipController.getExistingRelationshipsToIdentity(localRequest.peer);

            if (existingRelationshipsToPeer.length === 0 && template.cache?.expiresAt && template.isExpired()) {
                await this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache.expiresAt);
            }
        }

        const dto = RequestMapper.toLocalRequestDTO(localRequest);

        return Result.ok(dto);
    }
}
