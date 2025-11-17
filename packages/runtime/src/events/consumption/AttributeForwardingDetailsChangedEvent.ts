import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class AttributeForwardingDetailsChangedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeForwardingDetailsChanged";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeForwardingDetailsChangedEvent.namespace, eventTargetAddress, data);
    }
}
