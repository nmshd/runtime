import { TransportDataEvent } from "@nmshd/transport";
import { ForwardableAttribute } from "../local/attributeTypes";

export class AttributeForwardedSharingInfosChangedEvent extends TransportDataEvent<ForwardableAttribute> {
    public static readonly namespace = "consumption.attributeForwardedSharingInfosChanged";

    public constructor(eventTargetAddress: string, data: ForwardableAttribute) {
        super(AttributeForwardedSharingInfosChangedEvent.namespace, eventTargetAddress, data);
    }
}
