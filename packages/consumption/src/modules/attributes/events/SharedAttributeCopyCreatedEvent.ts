import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export class SharedAttributeCopyCreatedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.sharedAttributeCopyCreated";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(SharedAttributeCopyCreatedEvent.namespace, eventTargetAddress, data);
    }
}
