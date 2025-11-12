import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes/LocalAttribute.js";

export class ForwardedAttributeDeletedByPeerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.forwardedAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(ForwardedAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
