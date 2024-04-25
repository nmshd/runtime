import { IdentityDeletionProcess } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class IdentityStatusChangedEvent extends TransportDataEvent<IdentityDeletionProcess | undefined> {
    public static readonly namespace = "transport.identityStatusChanged";

    public constructor(eventTargetAddress: string, data: IdentityDeletionProcess | undefined) {
        super(IdentityStatusChangedEvent.namespace, eventTargetAddress, data);
    }
}
