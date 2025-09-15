import { TransportDataEvent } from "@nmshd/transport";
import { AttributeWithForwardedSharingInfos } from "../local/attributeTypes";

export class AttributeForwardedSharingInfosChangedEvent extends TransportDataEvent<AttributeWithForwardedSharingInfos> {
    public static readonly namespace = "consumption.attributeForwardedSharingInfosChanged";

    public constructor(eventTargetAddress: string, data: AttributeWithForwardedSharingInfos) {
        super(AttributeForwardedSharingInfosChangedEvent.namespace, eventTargetAddress, data);
    }
}
