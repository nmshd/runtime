import { RelationshipChangedEvent } from "../../../events/index.js";
import { Relationship } from "../../relationships/local/Relationship.js";
import { ExternalEventProcessor } from "./ExternalEventProcessor.js";

export abstract class RelationshipExternalEventProcessor extends ExternalEventProcessor {
    protected triggerRelationshipChangedEvent(changedRelationship: Relationship, oldRelationship?: Relationship): void {
        if (!this.hasRelationshipChanged(changedRelationship, oldRelationship)) return;

        this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, changedRelationship));
    }

    private hasRelationshipChanged(changedRelationship: Relationship, oldRelationship?: Relationship): boolean {
        if (!oldRelationship) return true;

        return oldRelationship.auditLog.length !== changedRelationship.auditLog.length;
    }
}
