import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface ResolveCredentialOfferRequest {
    credentialOfferUrl: string;
}

export interface ResolveCredentialOfferResponse {
    jsonRepresentation: string;
}

class Validator extends SchemaValidator<ResolveCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveCredentialOfferRequest"));
    }
}

export class ResolveCredentialOfferUseCase extends UseCase<ResolveCredentialOfferRequest, ResolveCredentialOfferResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: ResolveCredentialOfferRequest): Promise<Result<ResolveCredentialOfferResponse>> {
        const result = await this.openId4VcController.resolveCredentialOffer(request.credentialOfferUrl);
        return Result.ok({ jsonRepresentation: result.data });
    }
}
