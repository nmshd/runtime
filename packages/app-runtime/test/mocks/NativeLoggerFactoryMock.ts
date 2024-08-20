import { Result } from "@js-soft/ts-utils";
import { WebLoggerFactory } from "@js-soft/web-logger";
import { INativeLoggerFactory } from "../../src";

export class NativeLoggerFactoryMock extends WebLoggerFactory implements INativeLoggerFactory {
    public override init(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
}
