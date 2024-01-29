import { DataEvent } from "../DataEvent";
import { SuccessionEventData } from "./SuccessionEventData";

export class RepositoryAttributeSucceededEvent extends DataEvent<SuccessionEventData> {
    public static readonly namespace = "consumption.repositoryAttributeSucceeded";

    public constructor(eventTargetAddress: string, data: SuccessionEventData) {
        super(RepositoryAttributeSucceededEvent.namespace, eventTargetAddress, data);
    }
}
