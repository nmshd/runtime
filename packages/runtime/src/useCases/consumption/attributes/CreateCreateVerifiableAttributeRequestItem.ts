import { Result } from "@js-soft/ts-utils";
import { getVCProcessor } from "@nmshd/consumption";
import { CreateAttributeRequestItem, CreateAttributeRequestItemJSON, IdentityAttributeJSON, RelationshipAttributeJSON, SupportedVCTypes } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateCreateVerifiableAttributeRequestItemRequest {
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    peer: string;
    credentialType: SupportedVCTypes;
    mustBeAccepted: boolean;
}

class Validator extends SchemaValidator<CreateCreateVerifiableAttributeRequestItemRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateCreateVerifiableAttributeRequestItemRequest"));
    }
}

export class CreateCreateVerifiableAttributeRequestItemUseCase extends UseCase<CreateCreateVerifiableAttributeRequestItemRequest, CreateAttributeRequestItemJSON> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateCreateVerifiableAttributeRequestItemRequest): Promise<Result<CreateAttributeRequestItemJSON>> {
        const attributeValue = request.content.value;
        const vc = await getVCProcessor(request.credentialType, this.accountController);

        const signedCredential = await vc.sign(attributeValue, request.peer);
        request.content.proof = { credential: signedCredential, credentialType: request.credentialType };

        return Result.ok(
            CreateAttributeRequestItem.from({
                attribute: request.content,
                mustBeAccepted: request.mustBeAccepted
            }).toJSON()
        );
    }
}
