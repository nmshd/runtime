import { RelationshipChangedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export abstract class RelationshipExternalEventProcessor extends ExternalEventProcessor {
    protected triggerRelationshipChangedEvent(changedRelationship: Relationship, oldRelationship?: Relationship): void {
        if (!this.didChangeRelationship(changedRelationship, oldRelationship)) return;

        this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, changedRelationship));
    }

    private didChangeRelationship(changedRelationship: Relationship, oldRelationship?: Relationship): boolean {
        if (!oldRelationship) return true;

        return oldRelationship.cache!.auditLog.length !== changedRelationship.cache!.auditLog.length;
    }
}
