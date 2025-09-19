import { TransportDataEvent } from "@nmshd/transport";
import { OwnIdentityAttribute } from "../local/attributeTypes/OwnIdentityAttribute";
import { OwnRelationshipAttribute } from "../local/attributeTypes/OwnRelationshipAttribute";
import { PeerRelationshipAttribute } from "../local/attributeTypes/PeerRelationshipAttribute";

export class AttributeForwardedSharingDetailsChangedEvent extends TransportDataEvent<OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute> {
    public static readonly namespace = "consumption.attributeForwardedSharingDetailsChanged";

    public constructor(eventTargetAddress: string, data: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute) {
        super(AttributeForwardedSharingDetailsChangedEvent.namespace, eventTargetAddress, data);
    }
}
