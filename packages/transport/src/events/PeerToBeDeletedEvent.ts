import { Relationship } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class PeerToBeDeletedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.peerToBeDeleted";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(PeerToBeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
