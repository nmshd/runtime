import { FileDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class FileOwnershipIsLockedEvent extends DataEvent<FileDTO> {
    public static readonly namespace = "transport.fileOwnershipIsLocked";

    public constructor(eventTargetAddress: string, data: FileDTO) {
        super(FileOwnershipIsLockedEvent.namespace, eventTargetAddress, data);
    }
}
