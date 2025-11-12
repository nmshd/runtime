import { Result } from "@js-soft/ts-utils";
import { BackboneCompatibilityController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";

export interface CheckBackboneCompatibilityResponse {
    isCompatible: boolean;
    backboneVersion: number;
    supportedMinBackboneVersion: number;
    supportedMaxBackboneVersion: number;
}

export class CheckBackboneCompatibilityUseCase extends UseCase<void, CheckBackboneCompatibilityResponse> {
    public constructor(@Inject private readonly backboneCompatibilityController: BackboneCompatibilityController) {
        super();
    }

    protected async executeInternal(): Promise<Result<CheckBackboneCompatibilityResponse>> {
        const result = await this.backboneCompatibilityController.checkBackboneCompatibility();
        if (result.isError) return Result.fail(result.error);

        return Result.ok(result.value);
    }
}
