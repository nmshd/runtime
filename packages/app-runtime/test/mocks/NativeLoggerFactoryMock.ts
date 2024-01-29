import { INativeLoggerFactory } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";
import { WebLoggerFactory } from "@js-soft/web-logger";

export class NativeLoggerFactoryMock extends WebLoggerFactory implements INativeLoggerFactory {
    public override init(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
}
