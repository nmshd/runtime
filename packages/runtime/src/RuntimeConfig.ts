import { IConfig } from "@nmshd/consumption";
import { IConfigOverwrite } from "@nmshd/transport";
import { ModuleConfiguration } from "./extensibility/modules/RuntimeModule";

export interface RuntimeConfig {
    transportLibrary: Omit<IConfigOverwrite, "supportedIdentityVersion">;
    consumptionLibrary: IConfig;

    modules: Record<string, ModuleConfiguration>;
}
