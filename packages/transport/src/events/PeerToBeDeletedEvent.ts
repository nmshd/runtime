import { Relationship } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class PeerToBeDeletedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.peerToBeDeleted";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(PeerToBeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
