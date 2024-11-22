import { Result } from "@js-soft/ts-utils";
import { TagsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { TagListDTO } from "../../../types/transport/TagDTO";
import { UseCase } from "../../common";
import { TagMapper } from "./TagMapper";

export class GetTagsUseCase extends UseCase<void, TagListDTO> {
    public constructor(@Inject private readonly tagController: TagsController) {
        super();
    }

    protected async executeInternal(): Promise<Result<TagListDTO>> {
        const tagList = await this.tagController.getTags();
        return Result.ok(TagMapper.toTagListDTO(tagList));
    }
}
