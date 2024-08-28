import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { PeerDeletionCancelledEvent } from "../../../events";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerDeletionCancelledExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class PeerDeletionCancelledExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerDeletionCancelledExternalEventData.fromAny(externalEvent.payload);

        const relationship = await this.accountController.relationships.setPeerDeletionInfo(CoreId.from(payload.relationshipId));

        this.eventBus.publish(new PeerDeletionCancelledEvent(this.ownAddress, relationship));

        return relationship;
    }
}
