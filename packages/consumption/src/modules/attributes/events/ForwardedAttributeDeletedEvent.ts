import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export class ForwardedAttributeDeletedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.forwardedAttributeDeleted";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(ForwardedAttributeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
