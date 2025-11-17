import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export interface AttributeSucceededEventData {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
}

export class AttributeSucceededEvent extends DataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.attributeSucceeded";

    public constructor(eventTargetAddress: string, data: AttributeSucceededEventData) {
        super(AttributeSucceededEvent.namespace, eventTargetAddress, data);
    }
}
