import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { Relationship } from "../../relationships/local/Relationship";
import { ExternalEvent } from "../data/ExternalEvent";
import { RelationshipExternalEventProcessor } from "./RelationshipExternalEventProcessor";

class RelationshipStatusChangedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class RelationshipStatusChangedExternalEventProcessor extends RelationshipExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Relationship | undefined> {
        const payload = RelationshipStatusChangedExternalEventData.fromAny(externalEvent.payload);
        const result = await this.accountController.relationships.applyRelationshipChangedEvent(payload.relationshipId);
        const changedRelationship = result.changedRelationship;

        if (!changedRelationship) return undefined;

        this.triggerRelationshipChangedEvent(changedRelationship, result.oldRelationship);

        return changedRelationship;
    }
}
