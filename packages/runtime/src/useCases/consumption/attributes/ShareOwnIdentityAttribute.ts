import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateOutgoingRequestParameters, ErrorValidationResult, LocalAttribute, OutgoingRequestsController, OwnIdentityAttribute } from "@nmshd/consumption";
import { Request, ShareAttributeRequestItem } from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { LocalRequestDTO } from "@nmshd/runtime-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, AttributeIdString, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RequestMapper } from "../requests";

export interface ShareOwnIdentityAttributeRequest {
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
    };
}

class Validator extends SchemaValidator<ShareOwnIdentityAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ShareOwnIdentityAttributeRequest"));
    }
}

// TODO: maybe call this ForwardOwnIdentityAttribute -> different PR
export class ShareOwnIdentityAttributeUseCase extends UseCase<ShareOwnIdentityAttributeRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly requestsController: OutgoingRequestsController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ShareOwnIdentityAttributeRequest): Promise<Result<LocalRequestDTO>> {
        const attributeId = CoreId.from(request.attributeId);
        const ownIdentityAttribute = await this.attributeController.getLocalAttribute(attributeId);
        if (!ownIdentityAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute.name));

        if (!(ownIdentityAttribute instanceof OwnIdentityAttribute)) return Result.fail(RuntimeErrors.attributes.isNotOwnIdentityAttribute(attributeId));

        const requestParams = CreateOutgoingRequestParameters.from({
            peer: request.peer,
            content: Request.from({
                ...(request.requestMetadata ?? {}),
                items: [
                    ShareAttributeRequestItem.from({
                        ...(request.requestItemMetadata ?? {}),
                        attribute: ownIdentityAttribute.content,
                        attributeId: ownIdentityAttribute.id,
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
