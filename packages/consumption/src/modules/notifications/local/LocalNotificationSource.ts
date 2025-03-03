import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface ILocalNotificationSource extends ISerializable {
    type: "Message";
    reference: ICoreId;
}

@type("LocalNotificationSource")
export class LocalNotificationSource extends Serializable implements ILocalNotificationSource {
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
