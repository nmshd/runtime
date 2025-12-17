import { OpenId4VciResolvedCredentialOffer } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController, OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export type AbstractRequestCredentialsRequest<T> = {
    credentialOffer: T;
    credentialConfigurationIds: string[];
} & ({} | { pinCode: string } | { accessToken: string });

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
            "pinCode" in request ? request.pinCode : undefined,
            "accessToken" in request ? request.accessToken : undefined
        );
        return Result.ok({ credentialResponses: credentialResponses });
    }
}
