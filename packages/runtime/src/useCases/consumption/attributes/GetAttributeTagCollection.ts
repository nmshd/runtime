import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeTagCollectionDTO } from "../../../types";
import { UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export class GetAttributeTagCollectionUseCase extends UseCase<void, AttributeTagCollectionDTO> {
    public constructor(@Inject private readonly attributesController: AttributesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<AttributeTagCollectionDTO>> {
        const tagList = await this.attributesController.getAttributeTagCollection();
        return Result.ok(AttributeMapper.toAttributeTagCollectionDTO(tagList));
    }
}
