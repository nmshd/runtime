import { Result } from "@js-soft/ts-utils";
import { VersionController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { UseCase } from "../common";

export class CheckBackboneCompatibilityUseCase extends UseCase<void, void> {
    public constructor(@Inject private readonly anonymousVersionController: VersionController) {
        super();
    }

    protected async executeInternal(): Promise<Result<void>> {
        const result = await this.anonymousVersionController.checkBackboneCompatibility();
        return result;
    }
}
