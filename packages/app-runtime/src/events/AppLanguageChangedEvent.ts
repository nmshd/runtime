import { Event } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/core-types";

export class AppLanguageChangedEvent extends Event {
    public static namespace = "AppLanguageChanged";
    public constructor(public readonly language: keyof typeof LanguageISO639) {
        super(AppLanguageChangedEvent.namespace);
    }
}
