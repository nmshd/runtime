import { Result } from "@js-soft/ts-utils";
import { CoreErrors, IConfig } from "../../core";
import { VersionClient } from "./backbone/VersionClient";

export class VersionController {
    private readonly client: VersionClient;
    private readonly config: IConfig;
    public constructor(config: IConfig) {
        this.client = new VersionClient(config);
        this.config = config;
    }

    public async checkBackboneCompatibility(): Promise<Result<void>> {
        const getBackboneVersionResult = await this.client.getBackboneVersion();
        if (getBackboneVersionResult.isError) {
            return Result.fail(getBackboneVersionResult.error);
        }
        const usedBackboneVersion = getBackboneVersionResult.value.majorVersion;

        if (this.config.supportedMinBackboneVersion > usedBackboneVersion || this.config.supportedMaxBackboneVersion < usedBackboneVersion) {
            return Result.fail(CoreErrors.general.runtimeVersionIncompatibleWithBackboneVersion(usedBackboneVersion));
        }
        return Result.ok(undefined);
    }
}
