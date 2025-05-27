import { TransportDataEvent } from "./TransportDataEvent";

export class FileOwnershipIsLockedEvent extends TransportDataEvent<string> {
    public static readonly namespace = "transport.fileOwnershipIsLocked";

    public constructor(eventTargetAddress: string, fileId: string) {
        super(FileOwnershipIsLockedEvent.namespace, eventTargetAddress, fileId);
    }
}
