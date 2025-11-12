import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IdentityDeletionProcess } from "../../accounts/data/IdentityDeletionProcess.js";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent.js";
import { ExternalEventProcessor } from "./ExternalEventProcessor.js";

class IdentityDeletionProcessStartedEventData extends Serializable {
    @serialize()
    @validate()
    public deletionProcessId: string;
}

export class IdentityDeletionProcessStartedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<IdentityDeletionProcess> {
        const messageReceivedPayload = IdentityDeletionProcessStartedEventData.fromAny(externalEvent.payload);

        const newIdentityDeletionProcess = await this.accountController.identityDeletionProcess.loadNewIdentityDeletionProcessFromBackbone(
            messageReceivedPayload.deletionProcessId
        );

        return newIdentityDeletionProcess;
    }
}
