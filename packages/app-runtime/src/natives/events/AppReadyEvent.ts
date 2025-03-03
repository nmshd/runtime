import { NativeEvent } from "../NativeEvent";

export class AppReadyEvent extends NativeEvent {
    public static namespace = "AppReadyEvent";
    public constructor() {
        super(AppReadyEvent.namespace);
    }
}
