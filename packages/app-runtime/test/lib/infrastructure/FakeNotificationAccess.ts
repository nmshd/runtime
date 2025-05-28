import { ILogger } from "@js-soft/logging-abstractions";
import { Result } from "@js-soft/ts-utils";
import { INotificationAccess, INotificationScheduleOptions } from "../../../src";

export class FakeNotificationAccess implements INotificationAccess {
    public constructor(private readonly logger: ILogger) {}

    public getPushToken(): Promise<Result<string>> {
        this.logger.info("FakeNotificationAccess.getPushToken()");
        return Promise.resolve(Result.ok("fake-push-token"));
    }

    public schedule(title: string, body: string, options?: INotificationScheduleOptions): Promise<Result<number>> {
        this.logger.info(`FakeNotificationAccess.schedule(${title},${body},${options})`);

        return Promise.resolve(Result.ok(0));
    }

    public update(id: number, title: string, body: string, options?: INotificationScheduleOptions): Promise<Result<void>> {
        this.logger.info(`FakeNotificationAccess.update(${id},${title},${body},${options})`);
        return Promise.resolve(Result.ok(undefined));
    }

    public clear(id: number): Promise<Result<void>> {
        this.logger.info(`FakeNotificationAccess.clear(${id})`);
        return Promise.resolve(Result.ok(undefined));
    }

    public clearAll(): Promise<Result<void>> {
        this.logger.info("FakeNotificationAccess.clearAll()");
        return Promise.resolve(Result.ok(undefined));
    }

    public getAll(): Promise<Result<number[]>> {
        this.logger.info("FakeNotificationAccess.getAll()");
        return Promise.resolve(Result.ok([0]));
    }

    public init(): Promise<Result<void>> {
        this.logger.info("FakeNotificationAccess.init()");
        return Promise.resolve(Result.ok(undefined));
    }
}
