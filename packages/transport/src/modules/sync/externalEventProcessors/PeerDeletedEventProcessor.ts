import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "../../../core";
import { PeerDeletedEvent } from "../../../events";
import { PeerDeletionInfo, PeerDeletionStatus } from "../../relationships/local/PeerDeletionInfo";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerDeletedEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class PeerDeletedEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerDeletedEventData.fromAny(externalEvent.payload);

        const peerDeletionInfo = PeerDeletionInfo.from({ deletionStatus: PeerDeletionStatus.Deleted });
        const relationship = await this.accountController.relationships.setPeerDeletionInfo(CoreId.from(payload.relationshipId), peerDeletionInfo);

        this.eventBus.publish(new PeerDeletedEvent(this.ownAddress, relationship));

        return relationship;
    }
}
