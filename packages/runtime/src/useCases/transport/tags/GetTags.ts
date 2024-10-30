import { Result } from "@js-soft/ts-utils";
import { BackboneTagList, TagController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";
import { TagMapper } from "./TagMapper";

export type GetTagsUseCaseResponse = BackboneTagList;

export class GetTagsUseCase extends UseCase<void, GetTagsUseCaseResponse> {
    public constructor(@Inject private readonly tagController: TagController) {
        super();
    }

    protected async executeInternal(): Promise<Result<GetTagsUseCaseResponse>> {
        return Result.ok(TagMapper.toTagListDTO(await this.tagController.getTags()));
    }
}
