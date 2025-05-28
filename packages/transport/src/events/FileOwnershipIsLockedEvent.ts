import { File } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class FileOwnershipIsLockedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.fileOwnershipIsLocked";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileOwnershipIsLockedEvent.namespace, eventTargetAddress, data);
    }
}
