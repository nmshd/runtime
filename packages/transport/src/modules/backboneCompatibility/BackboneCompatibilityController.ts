import { Result } from "@js-soft/ts-utils";
import { CoreErrors, IConfig } from "../../core";
import { VersionClient } from "./backbone/VersionClient";

export class BackboneCompatibilityController {
    private readonly client: VersionClient;
    private readonly config: IConfig;
    public constructor(config: IConfig) {
        this.client = new VersionClient(config);
        this.config = config;
    }

    public async getBackboneMajorVersion(): Promise<Result<number>> {
        const getBackboneVersionResult = await this.client.getBackboneVersion();
        if (getBackboneVersionResult.isError) return Result.fail(getBackboneVersionResult.error);

        return Result.ok(getBackboneVersionResult.value.majorVersion);
    }

    public async checkBackboneCompatibility(): Promise<Result<void>> {
        const getBackboneVersionResult = await this.client.getBackboneVersion();
        if (getBackboneVersionResult.isError) return Result.fail(getBackboneVersionResult.error);

        const backboneVersion = getBackboneVersionResult.value.majorVersion;

        if (this.config.supportedMinBackboneVersion > backboneVersion || this.config.supportedMaxBackboneVersion < backboneVersion) {
            return Result.fail(CoreErrors.general.runtimeVersionIncompatibleWithBackboneVersion(backboneVersion));
        }
        return Result.ok(undefined);
    }
}
