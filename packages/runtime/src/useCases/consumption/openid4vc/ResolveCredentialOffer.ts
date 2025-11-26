import { OpenId4VciResolvedCredentialOffer } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import stringifySafe from "json-stringify-safe";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface ResolveCredentialOfferRequest {
    credentialOfferUrl: string;
}

export interface ResolveCredentialOfferResponse {
    credentialOffer: OpenId4VciResolvedCredentialOffer;
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
        const credentialOffer = await this.openId4VcController.resolveCredentialOffer(request.credentialOfferUrl);
        return Result.ok({
            credentialOffer: JSON.parse(stringifySafe(credentialOffer))
        });
    }
}
