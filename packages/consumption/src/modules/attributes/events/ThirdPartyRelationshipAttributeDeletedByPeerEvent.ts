import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export class ThirdPartyRelationshipAttributeDeletedByPeerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.thirdPartyRelationshipAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(ThirdPartyRelationshipAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
