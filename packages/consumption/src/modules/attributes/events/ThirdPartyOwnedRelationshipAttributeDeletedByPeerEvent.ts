import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/LocalAttribute";

export class ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.thirdPartyOwnedRelationshipAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
