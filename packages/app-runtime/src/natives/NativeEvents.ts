import { INativePushNotification } from "./INativePushNotification";
import { NativeEvent } from "./NativeEvent";

/**
 * Event fired when {@link INativePushNotificationAccess} sucessfully received a registration token
 */
export class RemoteNotificationRegistrationEvent extends NativeEvent {
    public static namespace = "RemoteNotificationRegistration";
    public constructor(public readonly token: string) {
        super(RemoteNotificationRegistrationEvent.namespace);
    }
}

/**
 * Event fired when {@link INativePushNotificationAccess} received a remote notification
 */
export class RemoteNotificationEvent extends NativeEvent {
    public static namespace = "RemoteNotification";
    public constructor(public readonly notification: INativePushNotification) {
        super(RemoteNotificationEvent.namespace);
    }
}

/**
 * Event fired when {@link INativeConfigAccess} finishes a save operation
 */
export class ConfigurationSaveEvent extends NativeEvent {
    public static namespace = "ConfigurationSave";
    public constructor() {
        super(ConfigurationSaveEvent.namespace);
    }
}

/**
 * Event fired when {@link INativeConfigAccess} changes the configuration
 */
export class ConfigurationSetEvent extends NativeEvent {
    public static readonly namespace = "ConfigurationSet";
    public constructor(
        public readonly key: string,
        public readonly value: any
    ) {
        super(ConfigurationSetEvent.namespace);
    }
}

/**
 * Event fired when the {@link INativeConfigAccess} removes a configuration element
 */
export class ConfigurationRemoveEvent extends NativeEvent {
    public static namespace = "ConfigurationRemove";
    public constructor(public readonly key: string) {
        super(ConfigurationRemoveEvent.namespace);
    }
}

/**
 * Event fired when {@link INativeLaunchOptions} registers, that the app was started by an url
 */
export class UrlOpenEvent extends NativeEvent {
    public static namespace = "UrlOpenEvent";
    public constructor(public readonly url: string) {
        super(UrlOpenEvent.namespace);
    }
}

/**
 * Event fired when {@link INativeLaunchOptions} registers, that the app was started by a file open instruction
 */
export class FileViewEvent extends NativeEvent {
    public static namespace = "FileViewEvent";
    public constructor(public readonly uri: string) {
        super(FileViewEvent.namespace);
    }
}

/**
 * Event fired when the app is ready
 */
export class AppReadyEvent extends NativeEvent {
    public static namespace = "AppReadyEvent";
    public constructor() {
        super(AppReadyEvent.namespace);
    }
}

/**
 * Event fired when the app closes
 */
export class AppCloseEvent extends NativeEvent {
    public static namespace = "AppCloseEvent";
    public constructor() {
        super(AppCloseEvent.namespace);
    }
}

export enum ThemeTextStyle {
    Dark = "dark",
    Light = "light"
}

/**
 * Event fired when the app changes theme
 */
export class ThemeEvent extends NativeEvent {
    public static namespace = "ThemeEvent";
    public constructor(
        public readonly backgroundColor: string,
        public readonly textStyle: ThemeTextStyle,
        public readonly textColor?: string,
        public readonly image?: string
    ) {
        super(ThemeEvent.namespace);
    }
}

/**
 * Event fired when the back button is pressed
 */
export class BackButtonEvent extends NativeEvent {
    public static namespace = "BackButtonEvent";
    public constructor() {
        super(BackButtonEvent.namespace);
    }
}
