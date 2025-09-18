import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export interface AttributeSucceededEventData {
    predecessor: LocalAttribute;
    successor: LocalAttribute;
}

export class AttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.attributeSucceeded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(AttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
