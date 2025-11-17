import { RelationshipDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class PeerDeletedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.peerDeleted";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(PeerDeletedEvent.namespace, eventTargetAddress, data);
    }
}
