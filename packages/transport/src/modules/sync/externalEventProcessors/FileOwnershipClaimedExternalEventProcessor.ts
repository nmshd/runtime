import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { FileOwnershipClaimedEvent } from "../../../events/index.js";
import { File } from "../../files/local/File.js";
import { ExternalEvent } from "../data/ExternalEvent.js";
import { ExternalEventProcessor } from "./ExternalEventProcessor.js";

class FileOwnershipClaimedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public fileId: string;
}

export class FileOwnershipClaimedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<File | undefined> {
        const payload = FileOwnershipClaimedExternalEventData.fromAny(externalEvent.payload);

        const file = await this.accountController.files.updateFileFromBackbone(payload.fileId);

        file.clearOwnershipToken();
        const updatedFile = await this.accountController.files.updateFile(file);

        this.eventBus.publish(new FileOwnershipClaimedEvent(this.ownAddress, updatedFile));
        return updatedFile;
    }
}
