import { DataEvent } from "@nmshd/runtime";

export class LocalAccountDeletionDateChangedEvent extends DataEvent<string | undefined> {
    public static readonly namespace: string = "app.localAccountDeletionDateChanged";

    public constructor(address: string, data?: string) {
        super(LocalAccountDeletionDateChangedEvent.namespace, address, data);
    }
}
