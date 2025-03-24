import { Result } from "@js-soft/ts-utils";
import { getVCProcessor } from "@nmshd/consumption";
import {
    CreateAttributeRequestItem,
    CreateAttributeRequestItemJSON,
    IdentityAttributeJSON,
    RelationshipAttributeJSON,
    StatusListEntryCreationParameters,
    SupportedVCTypes
} from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateCreateVerifiableAttributeRequestItemRequest {
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    peer: string;
    credentialType: SupportedVCTypes;
    mustBeAccepted: boolean;
    statusList?: StatusListEntryCreationParameters;
}

export interface CreateCreateVerifiableAttribueRequestItemResponse {
    requestItem: CreateAttributeRequestItemJSON;
    statusListCredential?: unknown;
}

class Validator extends SchemaValidator<CreateCreateVerifiableAttributeRequestItemRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateCreateVerifiableAttributeRequestItemRequest"));
    }
}

export class CreateCreateVerifiableAttributeRequestItemUseCase extends UseCase<
    CreateCreateVerifiableAttributeRequestItemRequest,
    CreateCreateVerifiableAttribueRequestItemResponse
> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateCreateVerifiableAttributeRequestItemRequest): Promise<Result<CreateCreateVerifiableAttribueRequestItemResponse>> {
        const attributeValue = request.content.value;
        const vc = await getVCProcessor(request.credentialType, this.accountController);

        const { credential: signedCredential, statusListCredential } = await vc.sign(attributeValue, request.peer, request.statusList);
        request.content.proof = { credential: signedCredential, credentialType: request.credentialType };

        return Result.ok({
            requestItem: CreateAttributeRequestItem.from({
                attribute: request.content,
                mustBeAccepted: request.mustBeAccepted
            }).toJSON(),
            statusListCredential
        });
    }
}
