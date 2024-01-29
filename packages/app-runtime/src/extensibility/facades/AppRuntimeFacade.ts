import { Result } from "@js-soft/ts-utils";
import { ConsumptionServices, DataViewExpander, TransportServices } from "@nmshd/runtime";
import { AppRuntime } from "../../AppRuntime";
import { UserfriendlyApplicationError } from "../../UserfriendlyApplicationError";
import { UserfriendlyResult } from "../../UserfriendlyResult";

export abstract class AppRuntimeFacade {
    public constructor(
        protected readonly runtime: AppRuntime,
        protected readonly transportServices: TransportServices,
        protected readonly consumptionServices: ConsumptionServices,
        protected readonly expander: DataViewExpander
    ) {}

    protected async parseErrorResult<T>(result: Result<any>): Promise<Result<T, UserfriendlyApplicationError>> {
        const userfriendlyMessageResult = await this.runtime.translate(result.error.code);
        if (userfriendlyMessageResult.isSuccess) {
            return UserfriendlyResult.fail<T, UserfriendlyApplicationError>(UserfriendlyApplicationError.fromError(result.error, userfriendlyMessageResult.value));
        }
        return UserfriendlyResult.fail<T, UserfriendlyApplicationError>(UserfriendlyApplicationError.fromError(result.error, result.error.code));
    }

    protected async handleResult<TOriginal, TWanted>(
        result: Result<TOriginal>,
        parsingFunction: (value: TOriginal) => Promise<TWanted> | TWanted
    ): Promise<Result<TWanted, UserfriendlyApplicationError>> {
        if (result.isError) {
            return await this.parseErrorResult<TWanted>(result);
        }

        const parsed = await parsingFunction(result.value);
        return UserfriendlyResult.ok<TWanted, UserfriendlyApplicationError>(parsed);
    }
}
