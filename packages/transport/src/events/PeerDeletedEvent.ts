import { Relationship } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class PeerDeletedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.peerDeleted";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(PeerDeletedEvent.namespace, eventTargetAddress, data);
    }
}
