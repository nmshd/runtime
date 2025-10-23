import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { SimpleLoggerFactory } from "@js-soft/simple-logger";
import { EventBus } from "@js-soft/ts-utils";
import { SodiumWrapper } from "@nmshd/crypto";
import { AgentOptions } from "http";
import { AgentOptions as HTTPSAgentOptions } from "https";
import _ from "lodash";
import { ICorrelator } from "./ICorrelator";
import { TransportCoreErrors } from "./TransportCoreErrors";
import { TransportError } from "./TransportError";
import { TransportLoggerFactory } from "./TransportLoggerFactory";

let log: ILogger;

export interface IConfig {
    allowIdentityCreation: boolean;
    supportedDatawalletVersion: number;
    supportedIdentityVersion: number;
    supportedMinBackboneVersion: number;
    supportedMaxBackboneVersion: number;
    debug: boolean;
    platformClientId: string;
    platformClientSecret: string;
    platformTimeout: number;
    platformMaxRedirects: number;
    platformMaxUnencryptedFileSize: number;
    platformAdditionalHeaders?: Record<string, string>;
    baseUrl: string;
    addressGenerationHostnameOverride?: string;
    datawalletEnabled: boolean;
    httpAgentOptions: AgentOptions;
    httpsAgentOptions: HTTPSAgentOptions;
    tagCacheLifetimeInMinutes: number;
}

export interface IConfigOverwrite {
    allowIdentityCreation?: boolean;
    debug?: boolean;
    platformClientId: string;
    platformClientSecret: string;
    supportedIdentityVersion: number;
    platformTimeout?: number;
    platformMaxRedirects?: number;
    platformMaxUnencryptedFileSize?: number;
    platformAdditionalHeaders?: Record<string, string>;
    baseUrl: string;
    addressGenerationHostnameOverride?: string;
    datawalletEnabled?: boolean;
    httpAgentOptions?: AgentOptions;
    httpsAgentOptions?: HTTPSAgentOptions;
    tagCacheLifetimeInMinutes?: number;
}

export class Transport {
    private readonly _config: IConfig;
    public get config(): IConfig {
        return this._config;
    }

    private static readonly defaultConfig: IConfig = {
        allowIdentityCreation: true,
        supportedDatawalletVersion: 1,
        supportedIdentityVersion: -1,
        supportedMinBackboneVersion: 6,
        supportedMaxBackboneVersion: 7,
        debug: false,
        platformClientId: "",
        platformClientSecret: "",
        platformTimeout: 60000,
        platformMaxRedirects: 10,
        platformMaxUnencryptedFileSize: 10 * 1024 * 1024,
        baseUrl: "",
        datawalletEnabled: false,
        httpAgentOptions: {
            keepAlive: true,
            maxFreeSockets: 2
        },
        httpsAgentOptions: {
            keepAlive: true,
            maxFreeSockets: 2
        },
        tagCacheLifetimeInMinutes: 5
    };

    public constructor(
        customConfig: IConfigOverwrite,
        public readonly eventBus: EventBus,
        loggerFactory: ILoggerFactory = new SimpleLoggerFactory(),
        public readonly correlator?: ICorrelator
    ) {
        this._config = _.defaultsDeep({}, customConfig, Transport.defaultConfig);

        TransportLoggerFactory.init(loggerFactory);
        log = TransportLoggerFactory.getLogger(Transport);

        if (!this._config.platformClientId) {
            throw TransportCoreErrors.general.platformClientIdNotSet().logWith(log);
        }

        if (!this._config.platformClientSecret) {
            throw TransportCoreErrors.general.platformClientSecretNotSet().logWith(log);
        }

        if (!this._config.baseUrl) {
            throw TransportCoreErrors.general.baseUrlNotSet().logWith(log);
        }

        if (this._config.baseUrl.includes("|")) {
            throw TransportCoreErrors.general.invalidBaseUrl().logWith(log);
        }

        if (this._config.supportedDatawalletVersion < 1) {
            throw new TransportError("The given supported datawallet version is invalid. The value must be 1 or higher.");
        }

        if (this._config.supportedIdentityVersion < 1) {
            throw new TransportError("The given supported identity version is invalid. The value must be 1 or higher.");
        }
    }

    public async init(): Promise<Transport> {
        log.trace("Initializing Libsodium...");
        await SodiumWrapper.ready();
        log.trace("Libsodium initialized");

        log.info("Transport initialized");

        return this;
    }
}
