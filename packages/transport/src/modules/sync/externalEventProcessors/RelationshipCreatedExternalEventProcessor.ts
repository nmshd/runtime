import { RelationshipChangedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class RelationshipCreatedOrChangedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship | undefined> {
        const payload = externalEvent.payload as { relationshipId: string };
        const relationship = await this.accountController.relationships.applyIncomingEvent(payload.relationshipId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
            return relationship;
        }
        return;
    }
}
