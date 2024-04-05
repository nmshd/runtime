import { RelationshipChangedEvent } from "../../../events";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class RelationshipChangeCompletedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<void> {
        const payload = externalEvent.payload as { changeId: string };
        const relationship = await this.accountController.relationships.applyChangeById(payload.changeId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.accountController.identity.address.toString(), relationship));
            this.changedItems.addRelationship(relationship);
        }
    }
}
