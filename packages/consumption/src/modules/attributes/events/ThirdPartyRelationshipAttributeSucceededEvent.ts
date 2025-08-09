import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";
import { AttributeSucceededEventData } from "./AttributeSucceededEventData";

export class ThirdPartyRelationshipAttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.thirdPartyRelationshipAttributeSucceeded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(ThirdPartyRelationshipAttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
