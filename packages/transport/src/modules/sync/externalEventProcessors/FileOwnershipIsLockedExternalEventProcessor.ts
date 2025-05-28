import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { FileOwnershipIsLockedEvent } from "../../../events";
import { File } from "../../files/local/File";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class FileOwnershipIsLockedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public fileId: string;
}

export class FileOwnershipIsLockedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<File | undefined> {
        const payload = FileOwnershipIsLockedExternalEventData.fromAny(externalEvent.payload);
        const file = await this.accountController.files.getFile(CoreId.from(payload.fileId));

        if (!file) return;

        this.eventBus.publish(new FileOwnershipIsLockedEvent(this.ownAddress, file));
        return file;
    }
}
