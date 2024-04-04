import { EventBus } from "@js-soft/ts-utils";
import { RelationshipChangedEvent } from "../../../events";
import { RelationshipsController } from "../../relationships/RelationshipsController";
import { ChangedItems } from "../ChangedItems";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class RelationshipChangeCreatedEventProcessor extends ExternalEventProcessor {
    public constructor(
        eventBus: EventBus,
        changedItems: ChangedItems,
        ownAddress: string,
        private readonly relationshipsController: RelationshipsController
    ) {
        super(eventBus, changedItems, ownAddress);
    }

    public override async execute(externalEvent: BackboneExternalEvent): Promise<void> {
        const payload = externalEvent.payload as { changeId: string; relationshipId: string };
        const relationship = await this.relationshipsController.applyChangeById(payload.changeId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
            this.changedItems.addRelationship(relationship);
        }
    }
}
