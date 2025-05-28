import { ILogger } from "@js-soft/logging-abstractions";
import { ModuleConfiguration, RuntimeModule } from "@nmshd/runtime";
import { AppRuntime } from "../AppRuntime";

export interface IAppRuntimeModuleConstructor {
    new (runtime: AppRuntime, configuration: any, logger: ILogger): AppRuntimeModule;
}

export interface AppRuntimeModuleConfiguration extends ModuleConfiguration {}

export abstract class AppRuntimeModule<TConfig extends AppRuntimeModuleConfiguration = AppRuntimeModuleConfiguration> extends RuntimeModule<TConfig, AppRuntime> {}
