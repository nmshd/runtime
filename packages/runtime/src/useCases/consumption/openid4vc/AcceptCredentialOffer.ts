import { OpenId4VciRequestTokenResponse, OpenId4VciResolvedCredentialOffer } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../attributes";

export interface AbstractCredentialOfferRequest<T> {
    credentialOffer: T;
    credentialConfigurationIds: string[];
    pinCode?: string;
    accessToken?: OpenId4VciRequestTokenResponse;
}

export interface AcceptCredentialOfferRequest extends AbstractCredentialOfferRequest<OpenId4VciResolvedCredentialOffer> {}

export interface SchemaValidatableAcceptCredentialOfferRequest extends AbstractCredentialOfferRequest<Record<string, any>> {}

class Validator extends SchemaValidator<AcceptCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptCredentialOfferRequest"));
    }
}

export class AcceptCredentialOfferUseCase extends UseCase<AcceptCredentialOfferRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptCredentialOfferRequest): Promise<Result<LocalAttributeDTO>> {
        const result = await this.openId4VcController.acceptCredentialOffer(request.credentialOffer, request.credentialConfigurationIds, request.pinCode, request.accessToken);
        return Result.ok(AttributeMapper.toAttributeDTO(result));
    }
}
