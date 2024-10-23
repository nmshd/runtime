import { Result } from "@js-soft/ts-utils";
import { BackboneGetTag } from "@nmshd/transport/src/modules/tags/backbone/BackboneGetTag";
import { Inject } from "@nmshd/typescript-ioc";
import { GetTagsUseCase } from "../../..";

export class TagsFacade {
    public constructor(@Inject private readonly getTagsUseCase: GetTagsUseCase) {}

    public async getTags(): Promise<Result<BackboneGetTag>> {
        return await this.getTagsUseCase.execute();
    }
}
