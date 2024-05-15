import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IdentityDeletionProcess } from "../../accounts/data/IdentityDeletionProcess";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class IdentityDeletionProcessStartedEventData extends Serializable {
    @serialize()
    @validate()
    public deletionProcessId: string;
}

export class IdentityDeletionProcessStartedEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<IdentityDeletionProcess> {
        const messageReceivedPayload = IdentityDeletionProcessStartedEventData.fromAny(externalEvent.payload);

        const newIdentityDeletionProcess = await this.accountController.identityDeletionProcess.loadNewIdentityDeletionProcessFromBackbone(
            messageReceivedPayload.deletionProcessId
        );

        return newIdentityDeletionProcess;
    }
}
