import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { FetchedAuthorizationRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface ResolveAuthorizationRequestRequest {
    requestUrl: string;
}

class Validator extends SchemaValidator<ResolveAuthorizationRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveAuthorizationRequestRequest"));
    }
}

export class ResolveAuthorizationRequestUseCase extends UseCase<ResolveAuthorizationRequestRequest, FetchedAuthorizationRequestDTO> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: ResolveAuthorizationRequestRequest): Promise<Result<FetchedAuthorizationRequestDTO>> {
        const result = await this.openId4VcContoller.resolveAuthorizationRequest(request.requestUrl);

        return Result.ok({ authorizationRequest: result.authorizationRequest, usedCredentials: result.usedCredentials });
    }
}
