import { Result } from "@js-soft/ts-utils";
import { INativeEnvironment } from "./INativeEnvironment";

export interface INativeBootstrapper {
    isInitialized: boolean;
    nativeEnvironment: INativeEnvironment;
    init(): Promise<Result<void>>;
}
