import { File } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class FileOwnershipClaimedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.fileOwnershipClaimed";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileOwnershipClaimedEvent.namespace, eventTargetAddress, data);
    }
}
