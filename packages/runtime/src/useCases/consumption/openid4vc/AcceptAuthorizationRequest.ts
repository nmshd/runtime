import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface AcceptAuthorizationRequestRequest {
    authorizationRequest: any;
}

export interface AcceptAuthorizationRequestResponse {
    status: number;
    message: string;
}

class Validator extends SchemaValidator<AcceptAuthorizationRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptAuthorizationRequestRequest"));
    }
}

export class AcceptAuthorizationRequestUseCase extends UseCase<AcceptAuthorizationRequestRequest, AcceptAuthorizationRequestResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptAuthorizationRequestRequest): Promise<Result<AcceptAuthorizationRequestResponse>> {
        const result = await this.openId4VcController.acceptAuthorizationRequest(request.authorizationRequest);
        return Result.ok({ status: result.status, message: JSON.stringify(result.message) });
    }
}
