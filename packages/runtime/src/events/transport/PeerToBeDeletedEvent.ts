import { RelationshipDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class PeerToBeDeletedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.peerToBeDeleted";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(PeerToBeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
