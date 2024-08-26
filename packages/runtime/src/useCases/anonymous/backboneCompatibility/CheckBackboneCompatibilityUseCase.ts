import { Result } from "@js-soft/ts-utils";
import { BackboneCompatibilityController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { UseCase } from "../../common";

export interface CheckBackboneCompatibilityResponse {
    isCompatible: boolean;
    backboneVersion: number;
    supportedMinBackboneVersion: number;
    supportedMaxBackboneVersion: number;
}

export class CheckBackboneCompatibilityUseCase extends UseCase<void, CheckBackboneCompatibilityResponse> {
    public constructor(@Inject private readonly anonymousVersionController: BackboneCompatibilityController) {
        super();
    }

    protected async executeInternal(): Promise<Result<CheckBackboneCompatibilityResponse>> {
        const result = await this.anonymousVersionController.checkBackboneCompatibility();
        if (result.isError) return Result.fail(result.error);

        return Result.ok(result.value);
    }
}
