import { FileDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class FileWasViewedChangedEvent extends DataEvent<FileDTO> {
    public static readonly namespace = "transport.fileWasViewedChanged";

    public constructor(eventTargetAddress: string, data: FileDTO) {
        super(FileWasViewedChangedEvent.namespace, eventTargetAddress, data);
    }
}
