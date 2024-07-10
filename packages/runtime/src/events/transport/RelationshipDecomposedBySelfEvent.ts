import { RelationshipIdString } from "../../useCases/common";
import { DataEvent } from "../DataEvent";

export class RelationshipDecomposedBySelfEvent extends DataEvent<RelationshipIdString> {
    public static readonly namespace = "transport.relationshipDecomposedBySelf";

    public constructor(eventTargetAddress: string, data: RelationshipIdString) {
        super(RelationshipDecomposedBySelfEvent.namespace, eventTargetAddress, data);
    }
}
