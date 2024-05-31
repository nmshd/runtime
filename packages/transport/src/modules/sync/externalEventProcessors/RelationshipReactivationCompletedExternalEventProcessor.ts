import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { RelationshipReactivationCompletedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class RelationshipReactivationCompletedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class RelationshipReactivationCompletedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Relationship | undefined> {
        const payload = RelationshipReactivationCompletedExternalEventData.fromAny(externalEvent.payload);
        const relationship = await this.accountController.relationships.applyRelationshipChangedEvent(payload.relationshipId);

        this.eventBus.publish(new RelationshipReactivationCompletedEvent(this.ownAddress, relationship));
        return relationship;
    }
}
