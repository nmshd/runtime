import { File } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class FileOwnershipLockedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.fileOwnershipLocked";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileOwnershipLockedEvent.namespace, eventTargetAddress, data);
    }
}
