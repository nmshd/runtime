import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { RelationshipReactivationRequestedEvent } from "../../../events/index.js";
import { Relationship } from "../../relationships/local/Relationship.js";
import { ExternalEvent } from "../data/ExternalEvent.js";
import { RelationshipExternalEventProcessor } from "./RelationshipExternalEventProcessor.js";

class RelationshipReactivationRequestedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class RelationshipReactivationRequestedExternalEventProcessor extends RelationshipExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Relationship | undefined> {
        const payload = RelationshipReactivationRequestedExternalEventData.fromAny(externalEvent.payload);
        const result = await this.accountController.relationships.applyRelationshipChangedEvent(payload.relationshipId);
        const changedRelationship = result.changedRelationship;

        if (!changedRelationship) return undefined;

        this.eventBus.publish(new RelationshipReactivationRequestedEvent(this.ownAddress, changedRelationship));

        this.triggerRelationshipChangedEvent(changedRelationship, result.oldRelationship);

        return changedRelationship;
    }
}
