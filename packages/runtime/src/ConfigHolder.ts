import { RuntimeConfig } from "./RuntimeConfig.js";

export class ConfigHolder {
    readonly #config: RuntimeConfig;

    public getConfig(): RuntimeConfig {
        return this.#config;
    }

    public constructor(config: RuntimeConfig) {
        this.#config = config;
    }
}
