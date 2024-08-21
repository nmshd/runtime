import { Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { CheckBackboneCompatibilityUseCase } from "../../../useCases/anonymous/CheckBackboneCompatibilityUseCase";

export class VersionFacade {
    public constructor(@Inject private readonly checkBackboneCompatibilityUseCase: CheckBackboneCompatibilityUseCase) {}

    public async checkBackboneCompatibility(): Promise<Result<void>> {
        return await this.checkBackboneCompatibilityUseCase.execute();
    }
}
