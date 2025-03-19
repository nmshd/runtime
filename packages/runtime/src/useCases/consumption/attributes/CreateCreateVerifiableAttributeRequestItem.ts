import { Result } from "@js-soft/ts-utils";
import { AbstractVCProcessor } from "@nmshd/consumption";
import { CreateAttributeRequestItem, CreateAttributeRequestItemJSON, IdentityAttributeJSON, SupportedVCTypes } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateCreateVerifiableAttributeRequestItemRequest {
    content: IdentityAttributeJSON;
    peer: string;
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
        const parsedRequestAttribute = JSON.parse(JSON.stringify(request.content));
        const vc = await AbstractVCProcessor.getVCProcessor(SupportedVCTypes.SdJwtVc, this.accountController);

        const signedCredential = await vc.sign(parsedRequestAttribute, request.peer);
        request.content.proof = { credential: signedCredential, credentialType: SupportedVCTypes.SdJwtVc };

        return Result.ok(
            CreateAttributeRequestItem.from({
                attribute: request.content,
                mustBeAccepted: request.mustBeAccepted
            }).toJSON()
        );
    }
}
