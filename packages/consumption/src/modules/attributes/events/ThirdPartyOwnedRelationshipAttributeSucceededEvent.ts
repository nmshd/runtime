import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/LocalAttribute";
import { AttributeSucceededEventData } from "./AttributeSucceededEventData";

export class ThirdPartyOwnedRelationshipAttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.thirdPartyOwnedRelationshipAttributeSucceded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(ThirdPartyOwnedRelationshipAttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
