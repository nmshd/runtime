import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes/LocalAttribute.js";

export class AttributeWasViewedAtChangedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.attributeWasViewedAtChanged";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(AttributeWasViewedAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
