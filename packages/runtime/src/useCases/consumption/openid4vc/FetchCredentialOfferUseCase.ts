import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { FetchedCredentialOfferDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface FetchCredentialOfferRequest {
    credentialOfferUrl: string;
}

class Validator extends SchemaValidator<FetchCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveCredentialOfferRequest"));
    }
}

export class FetchCredentialOfferUseCase extends UseCase<FetchCredentialOfferRequest, FetchedCredentialOfferDTO> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: FetchCredentialOfferRequest): Promise<Result<FetchedCredentialOfferDTO>> {
        const result = await this.openId4VcContoller.fetchCredentialOffer(request.credentialOfferUrl);
        return Result.ok({ jsonRepresentation: result.data } as FetchedCredentialOfferDTO);
    }
}
