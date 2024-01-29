import { INativeKeychainAccess, INativeKeychainEntry } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";

export class NativeKeychainAccessMock implements INativeKeychainAccess {
    private keys: Record<string, INativeKeychainEntry> = {};

    public get(name: string): Promise<Result<INativeKeychainEntry>> {
        return Promise.resolve(Result.ok(this.keys[name]));
    }
    public set(key: string, value: any): Promise<Result<void>> {
        this.keys[key] = { key, value };
        return Promise.resolve(Result.ok(undefined));
    }
    public delete(key: string /* , value: any */): Promise<Result<void>> {
        delete this.keys[key];
        return Promise.resolve(Result.ok(undefined));
    }
    public list(): Promise<Result<INativeKeychainEntry[]>> {
        const ar = [];
        for (const key in this.keys) {
            ar.push(this.keys[key]);
        }
        return Promise.resolve(Result.ok(ar));
    }
    public init(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
}
