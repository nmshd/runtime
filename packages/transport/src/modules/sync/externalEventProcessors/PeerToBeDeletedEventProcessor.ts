import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "../../../core";
import { PeerToBeDeletedEvent } from "../../../events";
import { PeerStatus } from "../../relationships/local/PeerStatus";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerToBeDeletedEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class PeerToBeDeletedEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerToBeDeletedEventData.fromAny(externalEvent.payload);

        const relationship = await this.accountController.relationships.setPeerStatus(CoreId.from(payload.relationshipId), PeerStatus.ToBeDeleted);

        this.eventBus.publish(new PeerToBeDeletedEvent(this.ownAddress, relationship));

        return relationship;
    }
}
