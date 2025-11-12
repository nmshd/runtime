import { RelationshipTemplateDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class RelationshipTemplateAllocationsExhaustedEvent extends DataEvent<RelationshipTemplateDTO> {
    public static readonly namespace = "transport.relationshipTemplateAllocationsExhausted";

    public constructor(eventTargetAddress: string, data: RelationshipTemplateDTO) {
        super(RelationshipTemplateAllocationsExhaustedEvent.namespace, eventTargetAddress, data);
    }
}
