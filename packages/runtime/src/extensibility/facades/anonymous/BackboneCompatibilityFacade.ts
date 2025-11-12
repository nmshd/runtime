import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { CheckBackboneCompatibilityResponse, CheckBackboneCompatibilityUseCase } from "../../../useCases/index.js";

export class BackboneCompatibilityFacade {
    public constructor(@Inject private readonly checkBackboneCompatibilityUseCase: CheckBackboneCompatibilityUseCase) {}

    public async checkBackboneCompatibility(): Promise<Result<CheckBackboneCompatibilityResponse>> {
        return await this.checkBackboneCompatibilityUseCase.execute();
    }
}
