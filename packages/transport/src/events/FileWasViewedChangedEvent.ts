import { File } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class FileWasViewedChangedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.FileWasViewedChanged";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileWasViewedChangedEvent.namespace, eventTargetAddress, data);
    }
}
