import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IdentityDeletionProcessStatusChangedEvent } from "../../../events";
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
        const identityDeletionProcessJSONResponse = await this.accountController.identityDeletionProcess.identityDeletionProcessClient.getIdentityDeletionProcess(
            messageReceivedPayload.deletionProcessId
        );

        const identityDeletionProcess = IdentityDeletionProcess.from(identityDeletionProcessJSONResponse.value);
        await this.accountController.identityDeletionProcess.identityDeletionProcessCollection.create(identityDeletionProcess);

        // TODO: is it intended that we publish an Identity...ChangedEvent, even though we receive an Identity...StartedEvent?
        this.eventBus.publish(new IdentityDeletionProcessStatusChangedEvent(this.accountController.identity.address.toString(), identityDeletionProcess));

        return identityDeletionProcess;
    }
}
