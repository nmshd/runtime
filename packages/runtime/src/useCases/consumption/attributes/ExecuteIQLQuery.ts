import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { IQLQuery, IQLQueryJSON } from "@nmshd/content";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { AttributeMapper } from "./AttributeMapper.js";

export interface ExecuteIQLQueryRequest {
    query: Omit<IQLQueryJSON, "@type"> & { "@type"?: "IQLQuery" };
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
