import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export class AttributeDeletedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.attributeDeleted";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(AttributeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
