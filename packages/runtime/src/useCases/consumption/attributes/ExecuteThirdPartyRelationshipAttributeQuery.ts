import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { ThirdPartyRelationshipAttributeQuery, ThirdPartyRelationshipAttributeQueryJSON } from "@nmshd/content";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface ExecuteThirdPartyRelationshipAttributeQueryRequest {
    query: ThirdPartyRelationshipAttributeQueryJSON;
}

export class ExecuteThirdPartyRelationshipAttributeQueryUseCase extends UseCase<ExecuteThirdPartyRelationshipAttributeQueryRequest, LocalAttributeDTO[]> {
    public constructor(@Inject private readonly attributeController: AttributesController) {
        super();
    }

    protected async executeInternal(request: ExecuteThirdPartyRelationshipAttributeQueryRequest): Promise<Result<LocalAttributeDTO[]>> {
        const query = ThirdPartyRelationshipAttributeQuery.from(request.query);
        const attribute = await this.attributeController.executeThirdPartyRelationshipAttributeQuery(query);
        return Result.ok(AttributeMapper.toAttributeDTOList(attribute));
    }
}
