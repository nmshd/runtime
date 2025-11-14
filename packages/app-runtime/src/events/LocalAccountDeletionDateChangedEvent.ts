import { DataEvent } from "@nmshd/runtime";
import { LocalAccountDTO } from "../multiAccount/index.js";

export class LocalAccountDeletionDateChangedEvent extends DataEvent<LocalAccountDTO> {
    public static readonly namespace: string = "app.localAccountDeletionDateChanged";

    public constructor(address: string, localAccount: LocalAccountDTO) {
        super(LocalAccountDeletionDateChangedEvent.namespace, address, localAccount);
    }
}
