import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable } from "../../../core";
import { RelationshipChangedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class RelationshipChangeCompletedExternalEventData extends CoreSerializable {
    @serialize()
    @validate()
    public changeId: string;
}

export class RelationshipChangeCompletedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship | undefined> {
        const payload = RelationshipChangeCompletedExternalEventData.fromAny(externalEvent.payload);
        const relationship = await this.accountController.relationships.applyChangeById(payload.changeId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
            return relationship;
        }
        return;
    }
}
