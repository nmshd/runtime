import { IdentityDeletionProcessStatusChangedEvent } from "../../../events";
import { IdentityDeletionProcess } from "../../accounts/data/IdentityDeletionProcess";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class IdentityDeletionProcessStartedEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<IdentityDeletionProcess> {
        const messageReceivedPayload = externalEvent.payload as { deletionProcessId: string };
        const identityDeletionProcessJSONResponse = await this.accountController.identityDeletionProcess.identityDeletionProcessClient.getIdentityDeletionProcess(
            messageReceivedPayload.deletionProcessId
        );

        const identityDeletionProcess = IdentityDeletionProcess.from(identityDeletionProcessJSONResponse.value);
        await this.accountController.identityDeletionProcess.identityDeletionProcessCollection.create(identityDeletionProcess);

        this.eventBus.publish(new IdentityDeletionProcessStatusChangedEvent(this.accountController.identity.address.toString(), identityDeletionProcess));

        return identityDeletionProcess;
    }
}
