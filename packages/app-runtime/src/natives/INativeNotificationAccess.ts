import { Result } from "@js-soft/ts-utils";

export interface INativeNotificationAction {
    title: string;
    callback: Function;
}

export interface INativeNotificationScheduleOptions {
    buttonInput?: INativeNotificationAction[];
    textInput?: INativeNotificationAction[];
    callback?: Function;
    data?: any;
    id?: number;
}

export interface INativeNotificationAccess {
    getPushToken(): Promise<Result<string>>;
    schedule(title: string, body: string, options?: INativeNotificationScheduleOptions): Promise<Result<number>>;
    update(id: number, title: string, body: string, options?: INativeNotificationScheduleOptions): Promise<Result<void>>;
    clear(id: number): Promise<Result<void>>;
    clearAll(): Promise<Result<void>>;
    getAll(): Promise<Result<number[]>>;
    init(): Promise<Result<void>>;
}
