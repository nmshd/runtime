import { NodeLoggerFactory } from "@js-soft/node-logger";
import { Result } from "@js-soft/ts-utils";
import { INativeBootstrapper, INativeEnvironment } from "../../../src";
import { FakeNativeConfigAccess } from "./FakeNativeConfigAccess";
import { FakeNativeDatabaseFactory } from "./FakeNativeDatabaseFactory";
import { FakeNativeNotificationAccess } from "./FakeNativeNotificationAccess";

export class FakeNativeBootstrapper implements INativeBootstrapper {
    private _nativeEnvironment: INativeEnvironment;
    public get nativeEnvironment(): INativeEnvironment {
        return this._nativeEnvironment;
    }

    public get isInitialized(): boolean {
        return true;
    }

    public async init(): Promise<Result<void>> {
        const loggerFactory = new NodeLoggerFactory({
            appenders: {
                consoleAppender: {
                    type: "stdout",
                    layout: { type: "pattern", pattern: "%[[%p] %c - %m%]" }
                },
                console: {
                    type: "logLevelFilter",
                    level: "Warn",
                    appender: "consoleAppender"
                }
            },

            categories: {
                default: {
                    appenders: ["console"],
                    level: "TRACE"
                }
            }
        });

        const nativeLogger = loggerFactory.getLogger("FakeNatives");

        this._nativeEnvironment = {
            configAccess: new FakeNativeConfigAccess(),
            databaseFactory: new FakeNativeDatabaseFactory(),
            loggerFactory,
            notificationAccess: new FakeNativeNotificationAccess(nativeLogger)
        };

        await this._nativeEnvironment.notificationAccess.init();

        return Result.ok(undefined);
    }
}
