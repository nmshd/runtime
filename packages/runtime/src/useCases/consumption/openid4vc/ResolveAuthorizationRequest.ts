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
    usedCredentials: LocalAttributeDTO[];
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

        return Result.ok({
            authorizationRequest: JSON.parse(stringifySafe(result.authorizationRequest)),
            usedCredentials: AttributeMapper.toAttributeDTOList(result.usedCredentials)
        });
    }
}
