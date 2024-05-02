import { IdentityDeletionProcess } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class IdentityDeletionProcessStatusChangedEvent extends TransportDataEvent<IdentityDeletionProcess> {
    public static readonly namespace = "transport.identityDeletionProcessStatusChangedEvent";

    public constructor(eventTargetAddress: string, data: IdentityDeletionProcess) {
        super(IdentityDeletionProcessStatusChangedEvent.namespace, eventTargetAddress, data);
    }
}
