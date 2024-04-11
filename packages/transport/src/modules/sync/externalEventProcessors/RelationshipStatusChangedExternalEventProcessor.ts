import { RelationshipChangedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class RelationshipStatusChangedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship | undefined> {
        const payload = externalEvent.payload as { relationshipId: string; peer: string };
        const relationship = (await this.accountController.relationships.updateCache([payload.relationshipId]))[0];

        this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
        return relationship;
    }
}
