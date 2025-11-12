import { File } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class FileOwnershipLockedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.fileOwnershipLocked";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileOwnershipLockedEvent.namespace, eventTargetAddress, data);
    }
}
