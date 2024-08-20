import { Result } from "@js-soft/ts-utils";

// Icon/Image?

/**
 * Content of a button or text input of a notification
 */
export interface INativeNotificationAction {
    /**
     * title of the action
     */
    title: string;
    /**
     * function called with the result of the action
     */
    callback: Function;
}

/**
 * Additional options for displaying notifications
 */
export interface INativeNotificationScheduleOptions {
    /**
     * buttons which should be displayed as part of the notification
     */
    buttonInput?: INativeNotificationAction[];
    /**
     * input field which should be displayed as part of the notification
     */
    textInput?: INativeNotificationAction[];
    /**
     * callback function for the notification selection
     */
    callback?: Function;
    /**
     * additional data stored as part of the notification => can be accessed for example in the {@link callback}
     */
    data?: any;
    /**
     * explicitly specify the id of the notification
     */
    id?: number;
}

/**
 * Mangage local notifications
 */
export interface INativeNotificationAccess {
    /**
     * Display a local notification
     * @param title title displayed in notification
     * @param body body displayed in notification
     * @param options additional options
     */
    schedule(title: string, body: string, options?: INativeNotificationScheduleOptions): Promise<Result<number>>;
    /**
     * Update the content of an already displayed notification
     * @param id id of the notification to update
     * @param title new title of the notification
     * @param body new body of the notification
     * @param options new additional options of the notification
     */
    update(id: number, title: string, body: string, options?: INativeNotificationScheduleOptions): Promise<Result<void>>;
    /**
     * Remove a notification from being displayed
     * @param id id of the notification to remove
     */
    clear(id: number): Promise<Result<void>>;
    /**
     * Remove all notifications from being displayed
     */
    clearAll(): Promise<Result<void>>;
    /**
     * Retrieve all notifications currently being displayed
     */
    getAll(): Promise<Result<number[]>>;
    /**
     * Initialize module
     */
    init(): Promise<Result<void>>;
}
