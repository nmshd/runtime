import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/LocalAttribute";

export class OwnSharedAttributeDeletedByOwnerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.ownSharedAttributeDeletedByOwner";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(OwnSharedAttributeDeletedByOwnerEvent.namespace, eventTargetAddress, data);
    }
}
