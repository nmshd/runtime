import { OpenId4VpResolvedAuthorizationRequest } from "@nmshd/content";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
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

        return Result.ok({ authorizationRequest: result.authorizationRequest, matchingCredentials: AttributeMapper.toAttributeDTOList(result.matchingCredentials) });
    }
}
