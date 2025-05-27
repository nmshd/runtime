import { DataEvent } from "../DataEvent";

export interface FileOwnershipIsLockedEventData {
    fileId: string;
}

export class FileOwnershipIsLockedEvent extends DataEvent<FileOwnershipIsLockedEventData> {
    public static readonly namespace = "transport.fileOwnershipIsLocked";

    public constructor(eventTargetAddress: string, data: FileOwnershipIsLockedEventData) {
        super(FileOwnershipIsLockedEvent.namespace, eventTargetAddress, data);
    }
}
