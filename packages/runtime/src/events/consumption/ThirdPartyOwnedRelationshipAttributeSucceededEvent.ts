import { DataEvent } from "../DataEvent";
import { SuccessionEventData } from "./SuccessionEventData";

export class ThirdPartyOwnedRelationshipAttributeSucceededEvent extends DataEvent<SuccessionEventData> {
    public static readonly namespace = "consumption.thirdPartyOwnedRelationshipAttributeSucceeded";

    public constructor(eventTargetAddress: string, data: SuccessionEventData) {
        super(ThirdPartyOwnedRelationshipAttributeSucceededEvent.namespace, eventTargetAddress, data);
    }
}
