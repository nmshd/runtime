import { OpenId4VciResolvedCredentialOffer } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController, OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export type Oid4vciAuthentication = {} | { pinCode?: string } | { accessToken?: string };

export interface AbstractRequestCredentialsRequest<T> {
    credentialOffer: T;
    credentialConfigurationIds: string[];
    authentication: Oid4vciAuthentication;
}

export interface RequestCredentialsResponse {
    credentialResponses: OpenId4VciCredentialResponseJSON[];
}

export type RequestCredentialsRequest = AbstractRequestCredentialsRequest<OpenId4VciResolvedCredentialOffer>;

export type SchemaValidatableRequestCredentialsRequest = AbstractRequestCredentialsRequest<Record<string, any>>;

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
            "pinCode" in request.authentication ? request.authentication.pinCode : undefined,
            "accessToken" in request.authentication ? request.authentication.accessToken : undefined
        );
        return Result.ok({ credentialResponses: credentialResponses });
    }
}
