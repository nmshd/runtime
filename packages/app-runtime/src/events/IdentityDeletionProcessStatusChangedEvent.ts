import { DataEvent } from "@nmshd/runtime";
import { IdentityDeletionProcess } from "@nmshd/transport";

export class IdentityDeletionProcessStatusChangedEvent extends DataEvent<IdentityDeletionProcess> {
    public static readonly namespace: string = "app.identityDeletionProcessStatusChanged";

    public constructor(address: string, data: IdentityDeletionProcess) {
        super(IdentityDeletionProcessStatusChangedEvent.namespace, address, data);
    }
}
