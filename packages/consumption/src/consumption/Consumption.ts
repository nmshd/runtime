import _ from "lodash";

export interface IConfig {
    setDefaultRepositoryAttributes: boolean;
}

export interface IConfigOverwrite {
    setDefaultRepositoryAttributes?: boolean;
}

export class Consumption {
    private readonly _config: IConfig;
    public get config(): IConfig {
        return this._config;
    }

    private static readonly defaultConfig: IConfig = {
        setDefaultRepositoryAttributes: false
    };

    public constructor(customConfig: IConfigOverwrite) {
        this._config = _.defaultsDeep({}, customConfig, Consumption.defaultConfig);
    }
}
