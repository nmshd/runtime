import {
    Agent,
    ConsoleLogger,
    DependencyManager,
    DidKey,
    InjectionSymbols,
    Kms,
    LogLevel,
    StorageVersionRecord,
    type InitConfig,
    type KeyDidCreateOptions,
    type ModulesMap,
    type VerificationMethod
} from "@credo-ts/core";
import { AccountController } from "@nmshd/transport";
import { AttributesController } from "../../attributes";
import { EnmshedHolderKeyManagmentService } from "./EnmeshedHolderKeyManagmentService";
import { EnmeshedStorageService } from "./EnmeshedStorageService";
import { agentDependencies } from "./LocalAgentDependencies";

export class BaseAgent<AgentModules extends ModulesMap> {
    public config: InitConfig;
    public agent: Agent<AgentModules>;
    public did!: string;
    public didKey!: DidKey;
    public kid!: string;
    public verificationMethod!: VerificationMethod;

    public constructor(
        public readonly port: number,
        public readonly name: string,
        public readonly modules: AgentModules,
        public readonly accountController: AccountController,
        public readonly attributeController: AttributesController
    ) {
        this.name = name;
        this.port = port;

        const config = {
            allowInsecureHttpUrls: true,
            logger: new ConsoleLogger(LogLevel.off)
        } satisfies InitConfig;

        this.config = config;

        this.accountController = accountController;
        this.attributeController = attributeController;
        const dependencyManager = new DependencyManager();
        dependencyManager.registerInstance(InjectionSymbols.StorageService, new EnmeshedStorageService(accountController, attributeController));
        this.agent = new Agent(
            {
                config,
                dependencies: agentDependencies,
                modules
            },
            dependencyManager
        );
    }

    public async initializeAgent(privateKey: string): Promise<void> {
        // as we are not using askar we need to set the storage version
        const storage = this.agent.dependencyManager.resolve<EnmeshedStorageService<any>>(InjectionSymbols.StorageService);
        await storage.save(this.agent.context, new StorageVersionRecord({ storageVersion: "0.5.0" }));

        const kmsConfig = this.agent.dependencyManager.resolve(Kms.KeyManagementModuleConfig);
        kmsConfig.registerBackend(new EnmshedHolderKeyManagmentService());

        if (kmsConfig.backends.length === 0) throw new Error("No KMS backend registered");

        await this.agent.initialize();

        const keyId = privateKey;
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
    }

    public async shutdown(): Promise<void> {
        await this.agent.shutdown();
    }
}
