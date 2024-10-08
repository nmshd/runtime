import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IdentityDeletionProcess } from "../../accounts/data/IdentityDeletionProcess";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class IdentityDeletionProcessChangedEventData extends Serializable {
    @serialize()
    @validate()
    public deletionProcessId: string;
}

export class IdentityDeletionProcessChangedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<IdentityDeletionProcess> {
        const messageReceivedPayload = IdentityDeletionProcessChangedEventData.fromAny(externalEvent.payload);

        const newIdentityDeletionProcess = await this.accountController.identityDeletionProcess.updateCacheOfExistingIdentityDeletionProcess(
            messageReceivedPayload.deletionProcessId
        );

        return newIdentityDeletionProcess;
    }
}
