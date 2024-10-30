import { Result } from "@js-soft/ts-utils";
import { BackboneTagList } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { GetTagsUseCase } from "../../../useCases/transport/tags/GetTags";

export class TagsFacade {
    public constructor(@Inject private readonly getTagsUseCase: GetTagsUseCase) {}

    public async getTags(): Promise<Result<BackboneTagList>> {
        return await this.getTagsUseCase.execute();
    }
}
