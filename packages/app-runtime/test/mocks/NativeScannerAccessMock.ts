import { INativeScannerAccess } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";

export class NativeScannerAccessMock implements INativeScannerAccess {
    public scan(): Promise<Result<string>> {
        return Promise.resolve(Result.ok("MockData"));
    }
}
