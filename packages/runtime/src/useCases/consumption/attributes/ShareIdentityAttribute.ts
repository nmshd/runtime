import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateOutgoingRequestParameters, LocalAttribute, OutgoingRequestsController } from "@nmshd/consumption";
import { Request, ShareAttributeRequestItem } from "@nmshd/content";
import { AccountController, CoreAddress, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { AddressString, AttributeIdString, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RequestMapper } from "../requests";

export interface ShareIdentityAttributeRequest {
    attributeId: AttributeIdString;
    peer: AddressString;
    requestMetadata?: {
        title?: string;
        description?: string;
        metadata?: Record<string, any>;
        expiresAt?: ISO8601DateTimeString;
    };
}

class Validator extends SchemaValidator<ShareIdentityAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ShareIdentityAttributeRequest"));
    }
}

export class ShareIdentityAttributeUseCase extends UseCase<ShareIdentityAttributeRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly requestsController: OutgoingRequestsController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ShareIdentityAttributeRequest): Promise<Result<LocalRequestDTO>> {
        const repositoryAttributeId = CoreId.from(request.attributeId);
        const repositoryAttribute = await this.attributeController.getLocalAttribute(repositoryAttributeId);

        if (typeof repositoryAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute.name));
        }

        if (!repositoryAttribute.isRepositoryAttribute()) {
            return Result.fail(RuntimeErrors.attributes.isNoIdentityAttribute(repositoryAttribute.id));
        }

        const query = {
            "content.owner": this.accountController.identity.address.toString(),
            "content.@type": "IdentityAttribute",
            "shareInfo.sourceAttribute": request.attributeId,
            "shareInfo.peer": request.peer
        };
        const ownSharedIdentityAttributesOfRepositoryAttribute = await this.attributeController.getLocalAttributes(query);
        if (ownSharedIdentityAttributesOfRepositoryAttribute.length > 0) {
            return Result.fail(
                RuntimeErrors.attributes.identityAttributeHasAlreadyBeenSharedWithPeer(request.attributeId, request.peer, ownSharedIdentityAttributesOfRepositoryAttribute[0].id)
            );
        }

        const ownSharedIdentityAttributesOfRepositoryAttributeVersion = await this.attributeController.getSharedVersionsOfRepositoryAttribute(
            repositoryAttributeId,
            [CoreAddress.from(request.peer)],
            false
        );
        if (ownSharedIdentityAttributesOfRepositoryAttributeVersion.length > 0) {
            return Result.fail(
                RuntimeErrors.attributes.anotherVersionOfIdentityAttributeHasAlreadyBeenSharedWithPeer(
                    request.attributeId,
                    request.peer,
                    ownSharedIdentityAttributesOfRepositoryAttributeVersion[0].id
                )
            );
        }

        const requestMetadata = request.requestMetadata ?? {};
        const requestParams = CreateOutgoingRequestParameters.from({
            peer: request.peer,
            content: Request.from({
                ...requestMetadata,
                items: [
                    ShareAttributeRequestItem.from({
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
