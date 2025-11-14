import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { AttributeTagCollectionDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";
import { AttributeTagCollectionMapper } from "./AttributeTagCollectionMapper.js";

export class GetAttributeTagCollectionUseCase extends UseCase<void, AttributeTagCollectionDTO> {
    public constructor(@Inject private readonly attributesController: AttributesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<AttributeTagCollectionDTO>> {
        const attributeTagCollection = await this.attributesController.getAttributeTagCollection();
        return Result.ok(AttributeTagCollectionMapper.toAttributeTagCollectionDTO(attributeTagCollection));
    }
}
