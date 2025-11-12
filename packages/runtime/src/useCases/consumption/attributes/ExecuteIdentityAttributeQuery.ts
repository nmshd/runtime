import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { IdentityAttributeQuery, IdentityAttributeQueryJSON } from "@nmshd/content";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";
import { AttributeMapper } from "./AttributeMapper.js";

export interface ExecuteIdentityAttributeQueryRequest {
    query: IdentityAttributeQueryJSON;
}

export class ExecuteIdentityAttributeQueryUseCase extends UseCase<ExecuteIdentityAttributeQueryRequest, LocalAttributeDTO[]> {
    public constructor(@Inject private readonly attributeController: AttributesController) {
        super();
    }

    protected async executeInternal(request: ExecuteIdentityAttributeQueryRequest): Promise<Result<LocalAttributeDTO[]>> {
        const attributes = await this.attributeController.executeIdentityAttributeQuery(IdentityAttributeQuery.from(request.query));
        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
