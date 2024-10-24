import { DataEvent } from "../DataEvent";
import { SuccessionEventData } from "./SuccessionEventData";

export class ThirdPartyRelationshipAttributeSucceededEvent extends DataEvent<SuccessionEventData> {
    public static readonly namespace = "consumption.thirdPartyRelationshipAttributeSucceeded";

    public constructor(eventTargetAddress: string, data: SuccessionEventData) {
        super(ThirdPartyRelationshipAttributeSucceededEvent.namespace, eventTargetAddress, data);
    }
}
