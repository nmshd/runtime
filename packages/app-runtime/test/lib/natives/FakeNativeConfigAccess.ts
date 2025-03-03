import { Result } from "@js-soft/ts-utils";
import { INativeConfigAccess } from "../../../src";

export class FakeNativeConfigAccess implements INativeConfigAccess {
    public config: Record<string, any> = {};

    public get(key: string): Result<any> {
        return Result.ok(this.config[key]);
    }

    public set(key: string, value: any): Result<void> {
        this.config[key] = value;
        return Result.ok(undefined);
    }

    public remove(key: string): Result<void> {
        delete this.config[key];
        return Result.ok(undefined);
    }

    public save(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
}
