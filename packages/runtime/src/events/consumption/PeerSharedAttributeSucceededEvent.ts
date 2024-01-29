import { DataEvent } from "../DataEvent";
import { SuccessionEventData } from "./SuccessionEventData";

export class PeerSharedAttributeSucceededEvent extends DataEvent<SuccessionEventData> {
    public static readonly namespace = "consumption.peerSharedAttributeSucceeded";

    public constructor(eventTargetAddress: string, data: SuccessionEventData) {
        super(PeerSharedAttributeSucceededEvent.namespace, eventTargetAddress, data);
    }
}
