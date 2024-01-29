import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { IQLQuery, IQLQueryJSON } from "@nmshd/content";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface ExecuteIQLQueryRequest {
    query: IQLQueryJSON;
}

class Validator extends SchemaValidator<ExecuteIQLQueryRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ExecuteIQLQueryRequest"));
    }
}

export class ExecuteIQLQueryUseCase extends UseCase<ExecuteIQLQueryRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ExecuteIQLQueryRequest): Promise<Result<LocalAttributeDTO[]>> {
        const query = IQLQuery.from(request.query);
        const attribute = await this.attributeController.executeIQLQuery(query);
        return Result.ok(AttributeMapper.toAttributeDTOList(attribute));
    }
}
