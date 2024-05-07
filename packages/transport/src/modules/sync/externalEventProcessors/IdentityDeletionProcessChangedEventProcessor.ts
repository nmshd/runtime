import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IdentityDeletionProcess } from "../../accounts/data/IdentityDeletionProcess";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class IdentityDeletionProcessChangedEventData extends Serializable {
    @serialize()
    @validate()
    public deletionProcessId: string;
}

export class IdentityDeletionProcessChangedEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<IdentityDeletionProcess> {
        const messageReceivedPayload = IdentityDeletionProcessChangedEventData.fromAny(externalEvent.payload);

        const identityDeletionProcessJSONResponse = await this.accountController.identityDeletionProcess.identityDeletionProcessClient.getIdentityDeletionProcess(
            messageReceivedPayload.deletionProcessId
        );
        const newIdentityDeletionProcess = this.accountController.identityDeletionProcess.createIdentityDeletionProcessFromBackboneResponse(identityDeletionProcessJSONResponse);

        await this.accountController.identityDeletionProcess.updateIdentityDeletionProcess(newIdentityDeletionProcess, false);

        return newIdentityDeletionProcess;
    }
}
