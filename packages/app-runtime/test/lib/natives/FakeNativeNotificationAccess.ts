import { ILogger } from "@js-soft/logging-abstractions";
import { Result } from "@js-soft/ts-utils";
import { INativeNotificationAccess, INativeNotificationScheduleOptions } from "../../../src";

export class FakeNativeNotificationAccess implements INativeNotificationAccess {
    public constructor(private readonly logger: ILogger) {}

    public schedule(title: string, body: string, options?: INativeNotificationScheduleOptions): Promise<Result<number>> {
        this.logger.info(`NativeNotificationAccess.schedule(${title},${body},${options})`);

        return Promise.resolve(Result.ok(0));
    }

    public update(id: number, title: string, body: string, options?: INativeNotificationScheduleOptions): Promise<Result<void>> {
        this.logger.info(`NativeNotificationAccess.update(${id},${title},${body},${options})`);
        return Promise.resolve(Result.ok(undefined));
    }

    public clear(id: number): Promise<Result<void>> {
        this.logger.info(`NativeNotificationAccess.clear(${id})`);
        return Promise.resolve(Result.ok(undefined));
    }

    public clearAll(): Promise<Result<void>> {
        this.logger.info("NativeNotificationAccess.clearAll()");
        return Promise.resolve(Result.ok(undefined));
    }

    public getAll(): Promise<Result<number[]>> {
        this.logger.info("NativeNotificationAccess.getAll()");
        return Promise.resolve(Result.ok([0]));
    }

    public init(): Promise<Result<void>> {
        this.logger.info("NativeNotificationAccess.init()");
        return Promise.resolve(Result.ok(undefined));
    }
}
