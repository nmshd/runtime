import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface FetchedCredentialOfferRequest {
    data: string;
    pinCode?: string;
    requestedCredentials: string[];
}

class Validator extends SchemaValidator<FetchedCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("FetchedCredentialOfferRequest"));
    }
}

export class ResolveFetchedCredentialOfferUseCase extends UseCase<FetchedCredentialOfferRequest, VerifiableCredentialDTO> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: FetchedCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO>> {
        const result = await this.openId4VcContoller.processFetchedCredentialOffer(request.data, request.requestedCredentials, request.pinCode);
        return Result.ok({
            data: result.data,
            id: result.id,
            type: result.type,
            displayInformation: result.displayInformation
        });
    }
}
