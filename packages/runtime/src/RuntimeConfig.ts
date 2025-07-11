import { StorageConfig } from "@nmshd/crypto";
import { ProviderFactoryFunctions } from "@nmshd/rs-crypto-types";
import { IConfigOverwrite } from "@nmshd/transport";
import { ModuleConfiguration } from "./extensibility/modules/RuntimeModule";
import { DeciderModuleConfiguration } from "./modules";

export interface RuntimeConfig {
    transportLibrary: Omit<IConfigOverwrite, "supportedIdentityVersion">;
    modules: Record<string, ModuleConfiguration> & {
        decider: DeciderModuleConfiguration;
    };
    calFactory?: ProviderFactoryFunctions;
    calStorageConfig?: StorageConfig;
}
