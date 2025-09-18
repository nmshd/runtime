import { TransportDataEvent } from "@nmshd/transport";
import { ForwardableAttribute } from "../local/attributeTypes";

export class AttributeForwardedSharingDetailsChangedEvent extends TransportDataEvent<ForwardableAttribute> {
    public static readonly namespace = "consumption.attributeForwardedSharingDetailsChanged";

    public constructor(eventTargetAddress: string, data: ForwardableAttribute) {
        super(AttributeForwardedSharingDetailsChangedEvent.namespace, eventTargetAddress, data);
    }
}
