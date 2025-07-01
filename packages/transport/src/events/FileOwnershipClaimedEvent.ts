import { File } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class FileOwnershipClaimedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.fileOwnershipClaimed";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileOwnershipClaimedEvent.namespace, eventTargetAddress, data);
    }
}
