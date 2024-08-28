import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { PeerToBeDeletedEvent } from "../../../events";
import { PeerDeletionInfo, PeerDeletionStatus } from "../../relationships/local/PeerDeletionInfo";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class PeerToBeDeletedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipId: string;
}

export class PeerToBeDeletedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Relationship> {
        const payload = PeerToBeDeletedExternalEventData.fromAny(externalEvent.payload);

        const peerDeletionInfo = PeerDeletionInfo.from({ deletionStatus: PeerDeletionStatus.ToBeDeleted });
        const relationship = await this.accountController.relationships.setPeerDeletionInfo(CoreId.from(payload.relationshipId), peerDeletionInfo);

        this.eventBus.publish(new PeerToBeDeletedEvent(this.ownAddress, relationship));

        return relationship;
    }
}
