import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress } from "../../../core";
import { PeerDeletedEvent } from "../../../events";
import { PeerStatus } from "../../relationships/local/PeerStatus";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerDeletedEventData extends Serializable {
    @serialize()
    @validate()
    public peerAddress: string;
}

export class PeerDeletedEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerDeletedEventData.fromAny(externalEvent.payload);

        const relationship = await this.accountController.relationships.setPeerStatus(CoreAddress.from(payload.peerAddress), PeerStatus.Deleted);

        this.eventBus.publish(new PeerDeletedEvent(this.ownAddress, relationship));

        return relationship;
    }
}
