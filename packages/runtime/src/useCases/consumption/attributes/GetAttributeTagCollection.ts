import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeTagCollectionDTO } from "../../../types";
import { UseCase } from "../../common";
import { AttributeTagCollectionMapper } from "./AttributeTagCollectionMapper";

export class GetAttributeTagCollectionUseCase extends UseCase<void, AttributeTagCollectionDTO> {
    public constructor(@Inject private readonly attributesController: AttributesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<AttributeTagCollectionDTO>> {
        const attributeTagCollection = await this.attributesController.getAttributeTagCollection();
        return Result.ok(AttributeTagCollectionMapper.toAttributeTagCollectionDTO(attributeTagCollection));
    }
}
