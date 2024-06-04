import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { RelationshipChangedEvent, RelationshipReactivationRequestedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class RelationshipReactivationRequestedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class RelationshipReactivationRequestedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Relationship | undefined> {
        const payload = RelationshipReactivationRequestedExternalEventData.fromAny(externalEvent.payload);
        const relationship = await this.accountController.relationships.applyRelationshipChangedEvent(payload.relationshipId);

        this.eventBus.publish(new RelationshipReactivationRequestedEvent(this.ownAddress, relationship));
        this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
        return relationship;
    }
}
