import { RelationshipDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class RelationshipChangedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.relationshipChanged";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(RelationshipChangedEvent.namespace, eventTargetAddress, data);
    }
}
