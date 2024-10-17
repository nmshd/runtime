import { IConfigOverwrite } from "@nmshd/transport";
import { ModuleConfiguration } from "./extensibility/modules/RuntimeModule";
import { DeciderModuleConfiguration } from "./modules";

export interface RuntimeConfig {
    transportLibrary: Omit<IConfigOverwrite, "supportedIdentityVersion">;
    modules: Record<string, ModuleConfiguration> & {
        decider: DeciderModuleConfiguration;
    };
}
