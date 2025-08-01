import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";
import { AttributeSucceededEventData } from "./AttributeSucceededEventData";

export class PeerSharedAttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.peerSharedAttributeSucceeded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(PeerSharedAttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
