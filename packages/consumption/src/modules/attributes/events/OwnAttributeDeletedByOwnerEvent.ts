import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";

export class OwnAttributeDeletedByOwnerEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.ownAttributeDeletedByOwner";

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(OwnAttributeDeletedByOwnerEvent.namespace, eventTargetAddress, data);
    }
}
