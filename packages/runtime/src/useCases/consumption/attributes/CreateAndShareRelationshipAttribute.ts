import { Result } from "@js-soft/ts-utils";
import { CreateOutgoingRequestParameters, OutgoingRequestsController } from "@nmshd/consumption";
import { AttributeValues, CreateAttributeRequestItem, RelationshipAttribute, RelationshipAttributeConfidentiality, Request } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { AddressString, ISO8601DateTimeString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RequestMapper } from "../requests";

export interface CreateAndShareRelationshipAttributeRequest {
    content: {
        value: AttributeValues.Relationship.Json;
        key: string;
        confidentiality: RelationshipAttributeConfidentiality;
        isTechnical?: boolean;
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
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

class Validator extends SchemaValidator<CreateAndShareRelationshipAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateAndShareRelationshipAttributeRequest"));
    }
}

export class CreateAndShareRelationshipAttributeUseCase extends UseCase<CreateAndShareRelationshipAttributeRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly requestsController: OutgoingRequestsController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateAndShareRelationshipAttributeRequest): Promise<Result<LocalRequestDTO>> {
        const requestParams = CreateOutgoingRequestParameters.from({
            peer: request.peer,
            content: Request.from({
                ...(request.requestMetadata ?? {}),
                items: [
                    CreateAttributeRequestItem.from({
                        ...(request.requestItemMetadata ?? {}),
                        attribute: RelationshipAttribute.from({
                            "@type": "RelationshipAttribute",
                            owner: this.accountController.identity.address.toString(),
                            ...request.content
                        }),
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
