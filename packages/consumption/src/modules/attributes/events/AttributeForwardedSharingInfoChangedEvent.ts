import { TransportDataEvent } from "@nmshd/transport";
import { AttributeWithForwardedSharingInfos } from "../local/attributeTypes";

export class AttributeForwardedSharingInfoChangedEvent extends TransportDataEvent<AttributeWithForwardedSharingInfos> {
    public static readonly namespace = "consumption.attributeForwardedSharingInfoChanged";

    public constructor(eventTargetAddress: string, data: AttributeWithForwardedSharingInfos) {
        super(AttributeForwardedSharingInfoChangedEvent.namespace, eventTargetAddress, data);
    }
}
