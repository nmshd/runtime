import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { FileOwnershipClaimedEvent } from "../../../events";
import { File } from "../../files/local/File";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class FileOwnershipClaimedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public fileId: string;
}

export class FileOwnershipClaimedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<File | undefined> {
        const payload = FileOwnershipClaimedExternalEventData.fromAny(externalEvent.payload);

        const files = await this.accountController.files.updateCache([payload.fileId]);
        if (files.length === 0) return;

        const file = files[0];

        file.clearOwnershipToken();
        const updatedFile = await this.accountController.files.updateFile(file);

        this.eventBus.publish(new FileOwnershipClaimedEvent(this.ownAddress, updatedFile));
        return updatedFile;
    }
}
