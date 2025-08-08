import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export class PeerRelationshipAttributeDeletedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.peerRelationshipAttributeDeleted";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(PeerRelationshipAttributeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
