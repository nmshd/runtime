import { RelationshipDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class PeerToBeDeletedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.peerToBeDeleted";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(PeerToBeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
