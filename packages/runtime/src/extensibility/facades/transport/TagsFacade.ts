import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { TagListDTO } from "../../../types";
import { GetTagsUseCase } from "../../../useCases";

export class TagsFacade {
    public constructor(@Inject private readonly getTagsUseCase: GetTagsUseCase) {}

    public async getTags(): Promise<Result<TagListDTO>> {
        return await this.getTagsUseCase.execute();
    }
}
