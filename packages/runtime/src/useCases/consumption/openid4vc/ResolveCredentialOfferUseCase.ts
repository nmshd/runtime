import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface ResolveCredentialOfferRequest {
    credentialOfferUrl: string;
}

class Validator extends SchemaValidator<ResolveCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveCredentialOfferRequest"));
    }
}

export class ResolveCredentialOfferUseCase extends UseCase<ResolveCredentialOfferRequest, VerifiableCredentialDTO> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: ResolveCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO>> {
        const result = await this.openId4VcContoller.processCredentialOffer(request.credentialOfferUrl);
        return Result.ok(result);
    }
}
