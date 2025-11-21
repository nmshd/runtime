import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface AcceptCredentialOfferRequest {
    credentialOffer: string;
    pinCode?: string;
    credentialConfigurationIds: string[];
}

class Validator extends SchemaValidator<AcceptCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptCredentialOfferRequest"));
    }
}

export class AcceptCredentialOfferUseCase extends UseCase<AcceptCredentialOfferRequest, VerifiableCredentialDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO>> {
        const result = await this.openId4VcController.acceptCredentialOffer(request.credentialOffer, request.credentialConfigurationIds, request.pinCode);
        return Result.ok({
            data: result.data,
            id: result.id,
            type: result.type,
            displayInformation: result.displayInformation
        });
    }
}
