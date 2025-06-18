import { FileDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class FileWasViewedEvent extends DataEvent<FileDTO> {
    public static readonly namespace = "transport.fileWasViewed";

    public constructor(eventTargetAddress: string, data: FileDTO) {
        super(FileWasViewedEvent.namespace, eventTargetAddress, data);
    }
}
