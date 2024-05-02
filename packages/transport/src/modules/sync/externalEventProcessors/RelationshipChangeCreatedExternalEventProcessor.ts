import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable } from "../../../core/CoreSerializable";
import { RelationshipChangedEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class RelationshipChangeCreatedExternalEventData extends CoreSerializable {
    @serialize()
    @validate()
    public changeId: string;

    @serialize()
    @validate()
    public relationshipId: string;
}

export class RelationshipChangeCreatedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Relationship | undefined> {
        const payload = RelationshipChangeCreatedExternalEventData.fromAny(externalEvent.payload);
        const relationship = await this.accountController.relationships.applyChangeById(payload.changeId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
            return relationship;
        }
        return;
    }
}
