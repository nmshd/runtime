import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";
import { AttributeSucceededEventData } from "./AttributeSucceededEventData";

export class OwnSharedAttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.ownSharedAttributeSucceeded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(OwnSharedAttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
