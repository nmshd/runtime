import { Result } from "@js-soft/ts-utils";
import { BackboneGetTag } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { GetTagsUseCase } from "../../../useCases/transport/tags/GetTags";

export class TagsFacade {
    public constructor(@Inject private readonly getTagsUseCase: GetTagsUseCase) {}

    public async getTags(): Promise<Result<BackboneGetTag>> {
        return await this.getTagsUseCase.execute();
    }
}
