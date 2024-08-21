import { Result } from "@js-soft/ts-utils";

export interface INativeConfigAccess {
    get(key: string): Result<any>;
    set(key: string, value: any): Result<void>;
    remove(key: string): Result<void>;
    save(): Promise<Result<void>>;
    initDefaultConfig(path: string): Promise<Result<void>>;
    initRuntimeConfig(path: string): Promise<Result<void>>;
}
