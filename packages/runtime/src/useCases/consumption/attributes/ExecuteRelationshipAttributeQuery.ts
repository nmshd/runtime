import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { RelationshipAttributeQuery, RelationshipAttributeQueryJSON } from "@nmshd/content";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface ExecuteRelationshipAttributeQueryRequest {
    query: RelationshipAttributeQueryJSON;
}

export class ExecuteRelationshipAttributeQueryUseCase extends UseCase<ExecuteRelationshipAttributeQueryRequest, LocalAttributeDTO> {
    public constructor(@Inject private readonly attributeController: AttributesController) {
        super();
    }

    protected async executeInternal(request: ExecuteRelationshipAttributeQueryRequest): Promise<Result<LocalAttributeDTO>> {
        const attribute = await this.attributeController.executeRelationshipAttributeQuery(RelationshipAttributeQuery.from(request.query));
        if (!attribute) {
            return Result.fail(RuntimeErrors.general.recordNotFound("RelationshipAttribute"));
        }
        return Result.ok(AttributeMapper.toAttributeDTO(attribute));
    }
}
