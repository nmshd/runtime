import { IdentityDeletionProcess } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class IdentityDeletionProcessStatusChangedEvent extends TransportDataEvent<IdentityDeletionProcess | undefined> {
    public static readonly namespace = "transport.identityDeletionProcessStatusChanged";

    public constructor(eventTargetAddress: string, data?: IdentityDeletionProcess) {
        super(IdentityDeletionProcessStatusChangedEvent.namespace, eventTargetAddress, data);
    }
}
