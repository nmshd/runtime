import { RelationshipTemplateDTO } from "@nmshd/runtime-types";
import { DataEvent } from "@nmshd/runtime-types/src/events/DataEvent";

export class RelationshipTemplateAllocationsExhaustedEvent extends DataEvent<RelationshipTemplateDTO> {
    public static readonly namespace = "transport.relationshipTemplateAllocationsExhausted";

    public constructor(eventTargetAddress: string, data: RelationshipTemplateDTO) {
        super(RelationshipTemplateAllocationsExhaustedEvent.namespace, eventTargetAddress, data);
    }
}
