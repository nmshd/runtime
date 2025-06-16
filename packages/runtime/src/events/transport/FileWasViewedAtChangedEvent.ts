import { FileDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class FileWasViewedAtChangedEvent extends DataEvent<FileDTO> {
    public static readonly namespace = "transport.fileWasViewedAtChanged";

    public constructor(eventTargetAddress: string, data: FileDTO) {
        super(FileWasViewedAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
