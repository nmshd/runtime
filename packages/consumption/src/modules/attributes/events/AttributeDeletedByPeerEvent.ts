import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/LocalAttribute";

export class AttributeDeletedByPeerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.attributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(AttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
