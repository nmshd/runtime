import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class AttributeWasViewedAtChangedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeWasViewedAtChanged";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeWasViewedAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
