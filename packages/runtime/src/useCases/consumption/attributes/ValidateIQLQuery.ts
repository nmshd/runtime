import { Result } from "@js-soft/ts-utils";
import { IQLQuery, IQLQueryJSON } from "@nmshd/content";
import { IValidateResult, validate as validateIQL } from "@nmshd/iql";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";

export type ValidateIQLQueryResponse = IValidateResult;

export interface ValidateIQLQueryRequest {
    query: IQLQueryJSON;
}

class Validator extends SchemaValidator<ValidateIQLQueryRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ValidateIQLQueryRequest"));
    }
}

export class ValidateIQLQueryUseCase extends UseCase<ValidateIQLQueryRequest, ValidateIQLQueryResponse> {
    public constructor(@Inject validator: Validator) {
        super(validator);
    }

    protected executeInternal(request: ValidateIQLQueryRequest): Result<ValidateIQLQueryResponse> {
        const query = IQLQuery.from(request.query);
        const validationResult = validateIQL(query.queryString);
        return Result.ok(validationResult);
    }
}
