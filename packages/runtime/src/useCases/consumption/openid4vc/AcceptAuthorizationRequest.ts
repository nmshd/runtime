import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { AcceptAuthorizationRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface AcceptAuthorizationRequestRequest {
    jsonEncodedRequest: string;
}

class Validator extends SchemaValidator<AcceptAuthorizationRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptAuthorizationRequestRequest"));
    }
}

export class AcceptAuthorizationRequestUseCase extends UseCase<AcceptAuthorizationRequestRequest, AcceptAuthorizationRequestDTO> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptAuthorizationRequestRequest): Promise<Result<AcceptAuthorizationRequestDTO>> {
        const result = await this.openId4VcContoller.acceptAuthorizationRequest(request.jsonEncodedRequest);
        return Result.ok({ status: result.status, message: JSON.stringify(result.message) });
    }
}
