import { Relationship } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class PeerDeletionCancelledEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.peerDeletionCancelled";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(PeerDeletionCancelledEvent.namespace, eventTargetAddress, data);
    }
}
