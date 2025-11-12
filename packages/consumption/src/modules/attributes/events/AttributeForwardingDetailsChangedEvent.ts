import { TransportDataEvent } from "@nmshd/transport";
import { OwnIdentityAttribute } from "../local/attributeTypes/OwnIdentityAttribute.js";
import { OwnRelationshipAttribute } from "../local/attributeTypes/OwnRelationshipAttribute.js";
import { PeerRelationshipAttribute } from "../local/attributeTypes/PeerRelationshipAttribute.js";

export class AttributeForwardingDetailsChangedEvent extends TransportDataEvent<OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute> {
    public static readonly namespace = "consumption.attributeForwardingDetailsChanged";

    public constructor(eventTargetAddress: string, data: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute) {
        super(AttributeForwardingDetailsChangedEvent.namespace, eventTargetAddress, data);
    }
}
