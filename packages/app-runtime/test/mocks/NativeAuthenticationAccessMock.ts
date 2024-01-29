import { INativeAuthenticationAccess } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";

export class NativeAuthenticationAccessMock implements INativeAuthenticationAccess {
    public authenticate(/* options?: INativeAuthenticationOptions */): Promise<Result<boolean>> {
        return Promise.resolve(Result.ok(true));
    }
}
