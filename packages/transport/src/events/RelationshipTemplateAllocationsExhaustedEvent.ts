import { RelationshipTemplate } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class RelationshipTemplateAllocationsExhaustedEvent extends TransportDataEvent<RelationshipTemplate> {
    public static readonly namespace = "transport.relationshipTemplateAllocationsExhausted";

    public constructor(eventTargetAddress: string, data: RelationshipTemplate) {
        super(RelationshipTemplateAllocationsExhaustedEvent.namespace, eventTargetAddress, data);
    }
}
