import { Result } from "@js-soft/ts-utils";
import { IConfig } from "../../core";
import { VersionClient } from "./backbone/VersionClient";

export interface BackboneCompatibility {
    isCompatible: boolean;
    backboneVersion: number;
    supportedMinBackboneVersion: number;
    supportedMaxBackboneVersion: number;
}

export class BackboneCompatibilityController {
    private readonly client: VersionClient;

    public constructor(private readonly config: IConfig) {
        this.client = new VersionClient(config);
        this.config = config;
    }

    public async checkBackboneCompatibility(): Promise<Result<BackboneCompatibility>> {
        const getBackboneVersionResult = await this.client.getBackboneVersion();
        if (getBackboneVersionResult.isError) return Result.fail(getBackboneVersionResult.error);

        const backboneVersion = getBackboneVersionResult.value.majorVersion;

        const supportedMinBackboneVersion = this.config.supportedMinBackboneVersion;
        const supportedMaxBackboneVersion = this.config.supportedMaxBackboneVersion;

        return Result.ok({
            isCompatible: backboneVersion >= supportedMinBackboneVersion && backboneVersion <= supportedMaxBackboneVersion,
            backboneVersion: backboneVersion,
            supportedMinBackboneVersion,
            supportedMaxBackboneVersion
        });
    }
}
