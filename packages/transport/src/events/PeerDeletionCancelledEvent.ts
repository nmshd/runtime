import { Relationship } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class PeerDeletionCancelledEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.peerDeletionCancelled";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(PeerDeletionCancelledEvent.namespace, eventTargetAddress, data);
    }
}
