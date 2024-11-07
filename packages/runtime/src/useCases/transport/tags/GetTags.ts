import { Result } from "@js-soft/ts-utils";
import { TagController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { TagListDTO } from "../../../types/transport/TagDTO";
import { UseCase } from "../../common";
import { TagMapper } from "./TagMapper";

export class GetTagsUseCase extends UseCase<void, TagListDTO> {
    public constructor(@Inject private readonly tagController: TagController) {
        super();
    }

    protected async executeInternal(): Promise<Result<TagListDTO>> {
        return Result.ok(TagMapper.toTagListDTO(await this.tagController.getTags()));
    }
}
