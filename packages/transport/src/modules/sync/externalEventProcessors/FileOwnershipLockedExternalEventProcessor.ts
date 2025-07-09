import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { FileOwnershipLockedEvent } from "../../../events";
import { File } from "../../files/local/File";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class FileOwnershipLockedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public fileId: string;
}

export class FileOwnershipLockedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<File | undefined> {
        const payload = FileOwnershipLockedExternalEventData.fromAny(externalEvent.payload);
        const file = await this.accountController.files.getFile(CoreId.from(payload.fileId));

        if (!file) return;

        file.setOwnershipIsLocked();
        const updatedFile = await this.accountController.files.updateFile(file);

        this.eventBus.publish(new FileOwnershipLockedEvent(this.ownAddress, updatedFile));
        return updatedFile;
    }
}
