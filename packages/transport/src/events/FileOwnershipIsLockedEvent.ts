import { CoreId } from "@nmshd/core-types";
import { TransportDataEvent } from "./TransportDataEvent";

export interface FileIsLockedEventEventData {
    fileId: CoreId;
}

export class FileOwnershipIsLockedEvent extends TransportDataEvent<FileIsLockedEventEventData> {
    public static readonly namespace = "transport.fileOwnershipIsLocked";

    public constructor(eventTargetAddress: string, data: FileIsLockedEventEventData) {
        super(FileOwnershipIsLockedEvent.namespace, eventTargetAddress, data);
    }
}
