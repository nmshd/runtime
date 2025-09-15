import { Agent, ConsoleLogger, DependencyManager, DidKey, InjectionSymbols, LogLevel, type InitConfig, type ModulesMap, type VerificationMethod } from "@credo-ts/core";
import { KeyManagementModuleConfig } from "@credo-ts/core/build/modules/kms";
import { JsonWebKey } from "crypto";
import { FakeKeyManagmentService } from "./FakeKeyManagmentService";
import { FakeStorageService } from "./FakeStorageService";
import { agentDependencies } from "./LocalAgentDependencies";

export class BaseAgent<AgentModules extends ModulesMap> {
    public port: number;
    public name: string;
    public config: InitConfig;
    public agent: Agent<AgentModules>;
    public did!: string;
    public didKey!: DidKey;
    public kid!: string;
    public verificationMethod!: VerificationMethod;
    private readonly keyStorage: Map<string, JsonWebKey> = new Map<string, JsonWebKey>();

    public constructor({ port, name, modules }: { port: number; name: string; modules: AgentModules }) {
        this.name = name;
        this.port = port;

        const config = {
            label: name,
            allowInsecureHttpUrls: true,
            logger: new ConsoleLogger(LogLevel.off)
        } satisfies InitConfig;

        this.config = config;
        const dependencyManager = new DependencyManager();
        dependencyManager.registerInstance(InjectionSymbols.StorageService, new FakeStorageService());
        // dependencyManager.registerInstance(InjectionSymbols.StorageUpdateService, new FakeStorageService());
        if (!dependencyManager.isRegistered(InjectionSymbols.StorageService)) {
            // eslint-disable-next-line no-console
            console.log("StorageService not registered!!!");
        }
        this.agent = new Agent(
            {
                config,
                dependencies: agentDependencies,
                modules
            },
            dependencyManager
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async initializeAgent(privateKey: string): Promise<any> {
        // as we are not using askar we need to set the storage version
        const storrage = this.agent.dependencyManager.resolve<FakeStorageService<any>>(InjectionSymbols.StorageService);
        const versionRecord = { id: "STORAGE_VERSION_RECORD_ID", storageVersion: "0.5.0", value: "0.5.0" };
        await storrage.save(this.agent.context, versionRecord);
        // as we are not using askar we need to setup our own key management service
        const kmsConfig = this.agent.dependencyManager.resolve(KeyManagementModuleConfig);
        // TODO: think about adding the local key storrage to the FakeKMS constructor
        kmsConfig.registerBackend(new FakeKeyManagmentService());

        if (kmsConfig.backends.length === 0) throw new Error("No KMS backend registered");

        await this.agent.initialize();

        /* create a uuid based key id
        const keyId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        
        const didCreateResult = await this.agent.dids.create<KeyDidCreateOptions>({
            method: "key",
            options: {
                createKey: {
                    type: {
                        crv: "Ed25519",
                        kty: "OKP"
                    },
                    keyId: keyId
                }
            }
        });

        this.did = didCreateResult.didState.did!;
        this.didKey = DidKey.fromDid(this.did);
        this.kid = `${this.did}#${this.didKey.publicJwk.fingerprint}`;

        const verificationMethod = didCreateResult.didState.didDocument?.dereferenceKey(this.kid, ["authentication"]);
        if (!verificationMethod) throw new Error("No verification method found");
        this.verificationMethod = verificationMethod;
        */
    }

    public async shutdown(): Promise<void> {
        await this.agent.shutdown();
    }
}
