import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateOutgoingRequestParameters, ErrorValidationResult, LocalAttribute, OutgoingRequestsController } from "@nmshd/consumption";
import { Request, ShareAttributeRequestItem } from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { AddressString, AttributeIdString, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RequestMapper } from "../requests";

export interface ShareRepositoryAttributeRequest {
    attributeId: AttributeIdString;
    peer: AddressString;
    requestMetadata?: {
        title?: string;
        description?: string;
        metadata?: Record<string, any>;
        expiresAt?: ISO8601DateTimeString;
    };
    requestItemMetadata?: {
        description?: string;
        metadata?: Record<string, any>;
        requireManualDecision?: boolean;
    };
}

class Validator extends SchemaValidator<ShareRepositoryAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ShareRepositoryAttributeRequest"));
    }
}

export class ShareRepositoryAttributeUseCase extends UseCase<ShareRepositoryAttributeRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly requestsController: OutgoingRequestsController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ShareRepositoryAttributeRequest): Promise<Result<LocalRequestDTO>> {
        const repositoryAttributeId = CoreId.from(request.attributeId);
        const repositoryAttribute = await this.attributeController.getLocalAttribute(repositoryAttributeId);
        if (!repositoryAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute.name));

        if (!repositoryAttribute.isRepositoryAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(repositoryAttributeId));
        }

        const requestParams = CreateOutgoingRequestParameters.from({
            peer: request.peer,
            content: Request.from({
                ...(request.requestMetadata ?? {}),
                items: [
                    ShareAttributeRequestItem.from({
                        ...(request.requestItemMetadata ?? {}),
                        attribute: repositoryAttribute.content,
                        sourceAttributeId: repositoryAttribute.id,
                        mustBeAccepted: true
                    }).toJSON()
                ]
            })
        });

        const canCreateRequestResult = await this.requestsController.canCreate(requestParams);
        if (canCreateRequestResult.isError()) return Result.fail((canCreateRequestResult.items[0] as ErrorValidationResult).error);

        const localRequest = await this.requestsController.create(requestParams);
        await this.messageController.sendMessage({ recipients: [CoreAddress.from(request.peer)], content: localRequest.content });
        await this.accountController.syncDatawallet();

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
