import { NativeEvent } from "../NativeEvent";

export class UrlOpenEvent extends NativeEvent {
    public static namespace = "UrlOpenEvent";
    public constructor(public readonly url: string) {
        super(UrlOpenEvent.namespace);
    }
}
