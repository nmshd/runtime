import { FileDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class FileOwnershipLockedEvent extends DataEvent<FileDTO> {
    public static readonly namespace = "transport.fileOwnershipLocked";

    public constructor(eventTargetAddress: string, data: FileDTO) {
        super(FileOwnershipLockedEvent.namespace, eventTargetAddress, data);
    }
}
