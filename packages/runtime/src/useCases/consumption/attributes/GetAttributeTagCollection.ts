import { Result } from "@js-soft/ts-utils";
import { TagsController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeTagCollectionDTO } from "../../../types";
import { UseCase } from "../../common";
import { AttributeTagCollectionMapper } from "./AttributeTagCollectionMapper";

export class GetAttributeTagCollectionUseCase extends UseCase<void, AttributeTagCollectionDTO> {
    public constructor(@Inject private readonly tagsController: TagsController) {
        super();
    }

    protected async executeInternal(): Promise<Result<AttributeTagCollectionDTO>> {
        const attributeTagCollection = await this.tagsController.getAttributeTagCollection();
        return Result.ok(AttributeTagCollectionMapper.toAttributeTagCollectionDTO(attributeTagCollection));
    }
}
