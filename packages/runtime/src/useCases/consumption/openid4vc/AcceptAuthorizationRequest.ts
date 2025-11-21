import { OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { Oid4VpVerificationResultDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface AcceptAuthorizationRequestRequest {
    authorizationRequest: Record<string, any>;
}

class Validator extends SchemaValidator<AcceptAuthorizationRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptAuthorizationRequestRequest"));
    }
}

export class AcceptAuthorizationRequestUseCase extends UseCase<AcceptAuthorizationRequestRequest, Oid4VpVerificationResultDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptAuthorizationRequestRequest): Promise<Result<Oid4VpVerificationResultDTO>> {
        const result = await this.openId4VcController.acceptAuthorizationRequest(request.authorizationRequest as OpenId4VpResolvedAuthorizationRequest);
        return Result.ok({ status: result.status, message: JSON.stringify(result.message) });
    }
}
