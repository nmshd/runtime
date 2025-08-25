import { transformPrivateKeyToPrivateJwk } from "@credo-ts/askar";
import { Agent, Buffer, ConsoleLogger, DidKey, LogLevel, type InitConfig, type KeyDidCreateOptions, type ModulesMap, type VerificationMethod } from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";

export class BaseAgent<AgentModules extends ModulesMap> {
    public port: number;
    public name: string;
    public config: InitConfig;
    public agent: Agent<AgentModules>;
    public did!: string;
    public didKey!: DidKey;
    public kid!: string;
    public verificationMethod!: VerificationMethod;

    public constructor({ port, name, modules }: { port: number; name: string; modules: AgentModules }) {
        this.name = name;
        this.port = port;

        const config = {
            label: name,
            allowInsecureHttpUrls: true,
            logger: new ConsoleLogger(LogLevel.off)
        } satisfies InitConfig;

        this.config = config;

        this.agent = new Agent({
            config,
            dependencies: agentDependencies,
            modules
        });
    }

    public async initializeAgent(secretPrivateKey: string): Promise<any> {
        await this.agent.initialize();

        const { privateJwk } = transformPrivateKeyToPrivateJwk({
            type: {
                crv: "Ed25519",
                kty: "OKP"
            },
            privateKey: Buffer.from(secretPrivateKey)
        });

        const { keyId } = await this.agent.kms.importKey({
            privateJwk
        });

        const didCreateResult = await this.agent.dids.create<KeyDidCreateOptions>({
            method: "key",
            options: {
                keyId
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
