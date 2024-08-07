import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress } from "../../../core";
import { PeerStatus } from "../../relationships/local/PeerStatus";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerToBeDeletedEventData extends Serializable {
    @serialize()
    @validate()
    public peerAddress: string;
}

export class PeerToBeDeletedEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerToBeDeletedEventData.fromAny(externalEvent.payload);

        return await this.relationshipsController.setPeerStatus(CoreAddress.from(payload.peerAddress), PeerStatus.Deleted);
    }
}
