import { Relationship } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class PeerDeletedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.peerDeleted";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(PeerDeletedEvent.namespace, eventTargetAddress, data);
    }
}
