import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { AcceptProofRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface AcceptProofRequestRequest {
    jsonEncodedRequest: string;
}

class Validator extends SchemaValidator<AcceptProofRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptProofRequestRequest"));
    }
}

export class AcceptProofRequestUseCase extends UseCase<AcceptProofRequestRequest, AcceptProofRequestDTO> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptProofRequestRequest): Promise<Result<AcceptProofRequestDTO>> {
        const result = await this.openId4VcContoller.acceptProofRequest(request.jsonEncodedRequest);
        return Result.ok({ status: result.status, message: result.success } as AcceptProofRequestDTO);
    }
}
