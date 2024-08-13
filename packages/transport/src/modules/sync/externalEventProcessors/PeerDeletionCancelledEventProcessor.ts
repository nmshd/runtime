import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "../../../core";
import { PeerDeletionCancelledEvent } from "../../../events";
import { PeerStatus, Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerDeletionCancelledEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class PeerDeletionCancelledEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerDeletionCancelledEventData.fromAny(externalEvent.payload);

        const relationship = await this.accountController.relationships.setPeerStatus(CoreId.from(payload.relationshipId), PeerStatus.Active);

        this.eventBus.publish(new PeerDeletionCancelledEvent(this.ownAddress, relationship));

        return relationship;
    }
}
