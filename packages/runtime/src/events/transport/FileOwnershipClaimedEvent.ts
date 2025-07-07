import { FileDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class FileOwnershipClaimedEvent extends DataEvent<FileDTO> {
    public static readonly namespace = "transport.fileOwnershipClaimed";

    public constructor(eventTargetAddress: string, data: FileDTO) {
        super(FileOwnershipClaimedEvent.namespace, eventTargetAddress, data);
    }
}
