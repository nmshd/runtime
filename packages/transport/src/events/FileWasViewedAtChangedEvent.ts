import { File } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class FileWasViewedAtChangedEvent extends TransportDataEvent<File> {
    public static readonly namespace = "transport.FileWasViewedAtChanged";

    public constructor(eventTargetAddress: string, data: File) {
        super(FileWasViewedAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
