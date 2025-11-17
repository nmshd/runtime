import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { PeerDeletedEvent } from "../../../events/index.js";
import { PeerDeletionInfo, PeerDeletionStatus } from "../../relationships/local/PeerDeletionInfo.js";
import { Relationship } from "../../relationships/local/Relationship.js";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent.js";
import { ExternalEventProcessor } from "./ExternalEventProcessor.js";

class PeerDeletedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;

    @serialize()
    @validate()
    public deletionDate: CoreDate;
}

export class PeerDeletedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerDeletedExternalEventData.fromAny(externalEvent.payload);

        const peerDeletionInfo = PeerDeletionInfo.from({ deletionStatus: PeerDeletionStatus.Deleted, deletionDate: payload.deletionDate });
        const relationship = await this.accountController.relationships.setPeerDeletionInfo(CoreId.from(payload.relationshipId), peerDeletionInfo);

        this.eventBus.publish(new PeerDeletedEvent(this.ownAddress, relationship));

        return relationship;
    }
}
