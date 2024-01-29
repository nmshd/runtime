import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/LocalAttribute";

export class AttributeCreatedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.attributeCreated";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(AttributeCreatedEvent.namespace, eventTargetAddress, data);
    }
}
