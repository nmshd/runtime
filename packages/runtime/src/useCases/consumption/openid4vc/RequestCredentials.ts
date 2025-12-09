import { OpenId4VciRequestTokenResponse, OpenId4VciResolvedCredentialOffer } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController, OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface AbstractRequestCredentialsRequest<T> {
    credentialOffer: T;
    pinCode?: string;
    accessToken?: OpenId4VciRequestTokenResponse;
    credentialConfigurationIds: string[];
}

export interface RequestCredentialsResponse {
    credentialResponses: OpenId4VciCredentialResponseJSON[];
}

export interface RequestCredentialsRequest extends AbstractRequestCredentialsRequest<OpenId4VciResolvedCredentialOffer> {}

export interface SchemaValidatableRequestCredentialsRequest extends AbstractRequestCredentialsRequest<Record<string, any>> {}

class Validator extends SchemaValidator<RequestCredentialsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RequestCredentialsRequest"));
    }
}

export class RequestCredentialsUseCase extends UseCase<RequestCredentialsRequest, RequestCredentialsResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: RequestCredentialsRequest): Promise<Result<RequestCredentialsResponse>> {
        const credentialResponses = await this.openId4VcController.requestCredentials(
            request.credentialOffer,
            request.credentialConfigurationIds,
            request.pinCode,
            request.accessToken
        );
        return Result.ok({ credentialResponses: credentialResponses });
    }
}
