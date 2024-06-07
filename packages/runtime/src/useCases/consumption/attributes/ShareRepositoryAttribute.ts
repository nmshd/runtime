import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateOutgoingRequestParameters, DeletionStatus, LocalAttribute, OutgoingRequestsController } from "@nmshd/consumption";
import { Request, ShareAttributeRequestItem } from "@nmshd/content";
import { AccountController, CoreAddress, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
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
        title?: string;
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

        const query = {
            "content.owner": this.accountController.identity.address.toString(),
            "content.@type": "IdentityAttribute",
            "shareInfo.sourceAttribute": request.attributeId,
            "shareInfo.peer": request.peer,
            "deletionInfo.deletionStatus": { $ne: DeletionStatus.DeletedByPeer }
        };
        const ownSharedIdentityAttributesOfRepositoryAttribute = await this.attributeController.getLocalAttributes(query);
        if (ownSharedIdentityAttributesOfRepositoryAttribute.length > 0) {
            return Result.fail(
                RuntimeErrors.attributes.repositoryAttributeHasAlreadyBeenSharedWithPeer(request.attributeId, request.peer, ownSharedIdentityAttributesOfRepositoryAttribute[0].id)
            );
        }

        const sharedVersionsOfRepositoryAttribute = await this.attributeController.getSharedVersionsOfAttribute(repositoryAttributeId, [CoreAddress.from(request.peer)], false);
        const sharedVersionsNotDeletedByPeer = sharedVersionsOfRepositoryAttribute.filter((attr) => attr.deletionInfo?.deletionStatus !== DeletionStatus.DeletedByPeer);
        if (sharedVersionsNotDeletedByPeer.length > 0) {
            return Result.fail(
                RuntimeErrors.attributes.anotherVersionOfRepositoryAttributeHasAlreadyBeenSharedWithPeer(request.attributeId, request.peer, sharedVersionsNotDeletedByPeer[0].id)
            );
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
        if (canCreateRequestResult.isError()) return Result.fail(canCreateRequestResult.error);

        const localRequest = await this.requestsController.create(requestParams);
        await this.messageController.sendMessage({ recipients: [CoreAddress.from(request.peer)], content: localRequest.content });
        await this.accountController.syncDatawallet();

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
