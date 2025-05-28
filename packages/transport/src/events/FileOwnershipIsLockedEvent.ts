import { CoreId } from "@nmshd/core-types";
import { TransportDataEvent } from "./TransportDataEvent";

export interface FileOwnershipIsLockedEventData {
    fileId: CoreId;
}

export class FileOwnershipIsLockedEvent extends TransportDataEvent<FileOwnershipIsLockedEventData> {
    public static readonly namespace = "transport.fileOwnershipIsLocked";

    public constructor(eventTargetAddress: string, data: FileOwnershipIsLockedEventData) {
        super(FileOwnershipIsLockedEvent.namespace, eventTargetAddress, data);
    }
}
