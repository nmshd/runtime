import { IdentityStatus } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class IdentityStatusChangedEvent extends TransportDataEvent<IdentityStatus> {
    public static readonly namespace = "transport.identityStatusChanged";

    public constructor(eventTargetAddress: string, data: IdentityStatus) {
        super(IdentityStatusChangedEvent.namespace, eventTargetAddress, data);
    }
}
