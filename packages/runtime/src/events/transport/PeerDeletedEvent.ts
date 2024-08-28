import { RelationshipDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class PeerDeletedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.peerDeleted";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(PeerDeletedEvent.namespace, eventTargetAddress, data);
    }
}
