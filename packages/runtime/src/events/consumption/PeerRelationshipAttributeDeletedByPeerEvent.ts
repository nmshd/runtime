import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class PeerRelationshipAttributeDeletedByPeerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.peerRelationshipAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(PeerRelationshipAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
