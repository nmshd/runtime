import { IConfigOverwrite } from "@nmshd/transport";
import { ModuleConfiguration } from "./extensibility/modules/RuntimeModule";

export interface RuntimeConfig {
    transportLibrary: Omit<IConfigOverwrite, "supportedIdentityVersion">;

    modules: Record<string, ModuleConfiguration>;
}
