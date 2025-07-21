import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export class PeerSharedAttributeDeletedByPeerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.peerSharedAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(PeerSharedAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
