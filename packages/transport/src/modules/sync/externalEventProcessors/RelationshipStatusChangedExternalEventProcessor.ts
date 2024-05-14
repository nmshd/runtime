import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable } from "../../../core/CoreSerializable";
import { RelationshipChangedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class RelationshipStatusChangedExternalEventData extends CoreSerializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class RelationshipStatusChangedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Relationship | undefined> {
        const payload = RelationshipStatusChangedExternalEventData.fromAny(externalEvent.payload);
        const relationship = await this.accountController.relationships.applyRelationshipStatusChangedEvent(payload.relationshipId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
            return relationship;
        }
      
        return;
    }
}
