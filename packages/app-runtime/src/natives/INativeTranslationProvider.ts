import { Result } from "@js-soft/ts-utils";

export interface INativeTranslationProvider {
    translate(key: string, ...values: (string | number | boolean | { toString: Function })[]): Promise<Result<string>>;
}
