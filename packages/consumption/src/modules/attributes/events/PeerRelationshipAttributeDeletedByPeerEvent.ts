import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes/LocalAttribute";

export class PeerRelationshipAttributeDeletedByPeerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.peerRelationshipAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(PeerRelationshipAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
