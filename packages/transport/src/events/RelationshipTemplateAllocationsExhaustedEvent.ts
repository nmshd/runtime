import { RelationshipTemplate } from "../modules/relationshipTemplates/local/RelationshipTemplate";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipTemplateAllocationsExhaustedEvent extends TransportDataEvent<RelationshipTemplate> {
    public static readonly namespace = "transport.relationshipTemplateAllocationsExhausted";

    public constructor(eventTargetAddress: string, data: RelationshipTemplate) {
        super(RelationshipTemplateAllocationsExhaustedEvent.namespace, eventTargetAddress, data);
    }
}
