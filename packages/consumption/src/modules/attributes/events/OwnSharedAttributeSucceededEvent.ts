import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/LocalAttribute";
import { AttributeSucceededEventData } from "./AttributeSucceededEventData";

export class OwnSharedAttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.ownSharedAttributeSucceded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(OwnSharedAttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
