import { File } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class FileWasViewedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.FileWasViewed";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileWasViewedEvent.namespace, eventTargetAddress, data);
    }
}
