import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttributeListener } from "../local/LocalAttributeListener";

export class AttributeListenerCreatedEvent extends TransportDataEvent<LocalAttributeListener> {
    public static readonly namespace = "consumption.attributeListenerCreated";

    public constructor(eventTargetAddress: string, data: LocalAttributeListener) {
        super(AttributeListenerCreatedEvent.namespace, eventTargetAddress, data);
    }
}
