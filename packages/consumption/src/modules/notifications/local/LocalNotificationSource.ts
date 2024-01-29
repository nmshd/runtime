import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "@nmshd/transport";

export interface ILocalNotificationSource extends ICoreSerializable {
    type: "Message";
    reference: ICoreId;
}

@type("LocalNotificationSource")
export class LocalNotificationSource extends CoreSerializable implements ILocalNotificationSource {
    @serialize()
    @validate()
    public type: "Message";

    @serialize()
    @validate()
    public reference: CoreId;

    public static from(value: ILocalNotificationSource): LocalNotificationSource {
        return this.fromAny(value);
    }

    public static message(reference: CoreId): LocalNotificationSource {
        return LocalNotificationSource.from({
            type: "Message",
            reference
        });
    }
}
