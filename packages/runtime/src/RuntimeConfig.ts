import { IConfigOverwrite } from "@nmshd/transport";
import { ModuleConfiguration } from "./extensibility/modules/RuntimeModule.js";
import { DeciderModuleConfiguration } from "./modules/index.js";

export interface RuntimeConfig {
    transportLibrary: Omit<IConfigOverwrite, "supportedIdentityVersion">;
    modules: Record<string, ModuleConfiguration> & {
        decider: DeciderModuleConfiguration;
    };
}
