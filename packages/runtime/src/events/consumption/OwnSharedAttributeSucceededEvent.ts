import { DataEvent } from "../DataEvent";
import { SuccessionEventData } from "./SuccessionEventData";

export class OwnSharedAttributeSucceededEvent extends DataEvent<SuccessionEventData> {
    public static readonly namespace = "consumption.ownSharedAttributeSucceeded";

    public constructor(eventTargetAddress: string, data: SuccessionEventData) {
        super(OwnSharedAttributeSucceededEvent.namespace, eventTargetAddress, data);
    }
}
