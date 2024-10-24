import { Result } from "@js-soft/ts-utils";
import { BackboneGetTag, TagController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";

export class GetTagsUseCase extends UseCase<void, BackboneGetTag> {
    public constructor(@Inject private readonly tagController: TagController) {
        super();
    }

    protected async executeInternal(): Promise<Result<BackboneGetTag>> {
        return Result.ok(await this.tagController.getTags());
    }
}
