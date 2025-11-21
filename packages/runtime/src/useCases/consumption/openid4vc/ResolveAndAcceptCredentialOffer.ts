import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface ResolveAndAcceptCredentialOfferRequest {
    credentialOfferUrl: string;
}

class Validator extends SchemaValidator<ResolveAndAcceptCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveAndAcceptCredentialOfferRequest"));
    }
}

export class ResolveAndAcceptCredentialOfferUseCase extends UseCase<ResolveAndAcceptCredentialOfferRequest, VerifiableCredentialDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: ResolveAndAcceptCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO>> {
        const result = await this.openId4VcController.resolveAndAcceptCredentialOffer(request.credentialOfferUrl);
        return Result.ok(result);
    }
}
