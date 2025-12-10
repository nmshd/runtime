import { OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import stringifySafe from "json-stringify-safe";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../attributes";

export interface ResolveAuthorizationRequestRequest {
    authorizationRequestUrl: string;
}

export interface ResolveAuthorizationRequestResponse {
    authorizationRequest: OpenId4VpResolvedAuthorizationRequest;
    matchingCredentials: LocalAttributeDTO[];
}

class Validator extends SchemaValidator<ResolveAuthorizationRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveAuthorizationRequestRequest"));
    }
}

export class ResolveAuthorizationRequestUseCase extends UseCase<ResolveAuthorizationRequestRequest, ResolveAuthorizationRequestResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: ResolveAuthorizationRequestRequest): Promise<Result<ResolveAuthorizationRequestResponse>> {
        const result = await this.openId4VcController.resolveAuthorizationRequest(request.authorizationRequestUrl);

        const authorizationRequest = JSON.parse(stringifySafe(result.authorizationRequest));

        if (result.matchingCredentials.length === 0) {
            return Result.ok({ authorizationRequest, matchingCredentials: [] });
        }

        // the 'get encoded' of the credential is lost while making it app-safe, we have to re-add it for PEX
        // quick-fix for the simplest case with one requested credential only - otherwise every [0] would have to be generalised.
        if (result.authorizationRequest.presentationExchange) {
            const encodedCredential =
                result.authorizationRequest.presentationExchange.credentialsForRequest.requirements[0].submissionEntry[0].verifiableCredentials[0].credentialRecord.encoded;
            authorizationRequest.presentationExchange.credentialsForRequest.requirements[0].submissionEntry[0].verifiableCredentials[0].credentialRecord.encoded =
                encodedCredential;
        }

        if (result.authorizationRequest.dcql) {
            const encodedCredential =
                result.authorizationRequest.presentationExchange.credentialsForRequest.requirements[0].submissionEntry[0].verifiableCredentials[0].credentialRecord.encoded;
            authorizationRequest.presentationExchange.credentialsForRequest.requirements[0].submissionEntry[0].verifiableCredentials[0].credentialRecord.encoded =
                encodedCredential;
        }

        return Result.ok({ authorizationRequest, matchingCredentials: AttributeMapper.toAttributeDTOList(result.matchingCredentials) });
    }
}
