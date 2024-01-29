import { INativePushNotificationAccess } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";

export class NativePushNotificationAccessMock implements INativePushNotificationAccess {
    public init(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
}
