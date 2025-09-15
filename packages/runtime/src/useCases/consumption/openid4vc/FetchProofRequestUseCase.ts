import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { FetchedProofRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface FetchProofRequestRequest {
    proofRequestUrl: string;
}

class Validator extends SchemaValidator<FetchProofRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("FetchProofRequestRequest"));
    }
}

export class FetchProofRequestUseCase extends UseCase<FetchProofRequestRequest, FetchedProofRequestDTO> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: FetchProofRequestRequest): Promise<Result<FetchedProofRequestDTO>> {
        const result = await this.openId4VcContoller.fetchProofRequest(request.proofRequestUrl);
        return Result.ok({ jsonRepresentation: result.data } as FetchedProofRequestDTO);
    }
}
