import { Result } from "@js-soft/ts-utils";

export interface INotificationAction {
    title: string;
    callback: Function;
}

export interface INotificationScheduleOptions {
    buttonInput?: INotificationAction[];
    textInput?: INotificationAction[];
    callback?: Function;
    data?: any;
    id?: number;
}

export interface INotificationAccess {
    getPushToken(): Promise<Result<string>>;
    schedule(title: string, body: string, options?: INotificationScheduleOptions): Promise<Result<number>>;
    update(id: number, title: string, body: string, options?: INotificationScheduleOptions): Promise<Result<void>>;
    clear(id: number): Promise<Result<void>>;
    clearAll(): Promise<Result<void>>;
    getAll(): Promise<Result<number[]>>;
    init(): Promise<Result<void>>;
}
