import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress } from "../../../core";
import { PeerStatus } from "../../relationships/local/PeerStatus";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerDeletionCancelledEventData extends Serializable {
    @serialize()
    @validate()
    public peerAddress: string;
}

export class PeerDeletionCancelledEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerDeletionCancelledEventData.fromAny(externalEvent.payload);

        return await this.accountController.relationships.setPeerStatus(CoreAddress.from(payload.peerAddress), PeerStatus.Active);
    }
}
