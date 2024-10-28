import { IDatabaseCollectionProvider, IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { SimpleLoggerFactory } from "@js-soft/simple-logger";
import { EventBus } from "@js-soft/ts-utils";
import { SodiumWrapper } from "@nmshd/crypto";
import { AgentOptions } from "http";
import { AgentOptions as HTTPSAgentOptions } from "https";
import _ from "lodash";
import { PeerCertificate, checkServerIdentity } from "tls";
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
    pinnedPublicKeys?: Record<string, string[]>;
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
    pinnedPublicKeys?: Record<string, string[]>;
}

export class Transport {
    private readonly databaseConnection: IDatabaseConnection;

    private readonly _config: IConfig;
    public get config(): IConfig {
        return this._config;
    }

    private static readonly defaultConfig: IConfig = {
        allowIdentityCreation: true,
        supportedDatawalletVersion: 1,
        supportedIdentityVersion: -1,
        supportedMinBackboneVersion: 6,
        supportedMaxBackboneVersion: 6,
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
        }
    };

    public constructor(
        databaseConnection: IDatabaseConnection,
        customConfig: IConfigOverwrite,
        public readonly eventBus: EventBus,
        loggerFactory: ILoggerFactory = new SimpleLoggerFactory(),
        public readonly correlator?: ICorrelator
    ) {
        if (customConfig.pinnedPublicKeys && customConfig.httpsAgentOptions?.checkServerIdentity) {
            throw TransportCoreErrors.general.conflictingServerIdentityChecks().logWith(log);
        }

        this.databaseConnection = databaseConnection;
        this._config = _.defaultsDeep({}, customConfig, Transport.defaultConfig);

        if (this._config.pinnedPublicKeys) {
            this._config.httpsAgentOptions = {
                ...this._config.httpsAgentOptions,
                checkServerIdentity: (host: string, certificate: PeerCertificate) => {
                    const error = checkServerIdentity(host, certificate);
                    if (error) {
                        return error;
                    }

                    const subject = certificate.subject.CN;
                    if (!(subject in this._config.pinnedPublicKeys!)) return;
                    if (this._config.pinnedPublicKeys![subject].includes(certificate.pubkey!.toString("base64"))) return;

                    return new Error(`Certificate verification error: The public key of ${certificate.subject.CN} doesn't match a pinned public key`);
                }
            };
        }

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

    public async createDatabase(name: string): Promise<IDatabaseCollectionProvider> {
        return await this.databaseConnection.getDatabase(name);
    }
}
