import { RelationshipDTO } from "../../dtos";
import { DataEvent } from "../DataEvent";

export class PeerDeletionCancelledEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.peerDeletionCancelled";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(PeerDeletionCancelledEvent.namespace, eventTargetAddress, data);
    }
}
