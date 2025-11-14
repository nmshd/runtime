import { Result } from "@js-soft/ts-utils";
import { IConfig, ICorrelator } from "../../core/index.js";
import { VersionClient } from "./backbone/VersionClient.js";

export interface BackboneCompatibility {
    isCompatible: boolean;
    backboneVersion: number;
    supportedMinBackboneVersion: number;
    supportedMaxBackboneVersion: number;
}

export class BackboneCompatibilityController {
    private readonly client: VersionClient;

    public constructor(
        private readonly config: IConfig,
        correlator?: ICorrelator
    ) {
        this.client = new VersionClient(config, correlator);
        this.config = config;
    }

    public async checkBackboneCompatibility(): Promise<Result<BackboneCompatibility>> {
        const getBackboneVersionResult = await this.client.getBackboneVersion();
        if (getBackboneVersionResult.isError) return Result.fail(getBackboneVersionResult.error);

        const backboneVersion = getBackboneVersionResult.value.majorVersion;
        const supportedMinBackboneVersion = this.config.supportedMinBackboneVersion;
        const supportedMaxBackboneVersion = this.config.supportedMaxBackboneVersion;
        const isCompatible = backboneVersion >= supportedMinBackboneVersion && backboneVersion <= supportedMaxBackboneVersion;

        return Result.ok({ isCompatible, backboneVersion, supportedMinBackboneVersion, supportedMaxBackboneVersion });
    }
}
