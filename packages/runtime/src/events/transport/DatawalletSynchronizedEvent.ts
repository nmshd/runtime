import { DataEvent } from "../DataEvent";

export class DatawalletSynchronizedEvent extends DataEvent<undefined> {
    public static readonly namespace: string = "transport.datawalletSynchronized";

    public constructor(eventTargetAddress: string) {
        super(DatawalletSynchronizedEvent.namespace, eventTargetAddress, undefined);
    }
}
