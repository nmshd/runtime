import { DataEvent } from "../DataEvent.js";

export class DatawalletSynchronizedEvent extends DataEvent<undefined> {
    public static readonly namespace: string = "transport.datawalletSynchronized";

    public constructor(eventTargetAddress: string) {
        super(DatawalletSynchronizedEvent.namespace, eventTargetAddress, undefined);
    }
}
