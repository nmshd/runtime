import { TransportDataEvent } from "./TransportDataEvent";

export class DatawalletSynchronizedEvent extends TransportDataEvent<undefined> {
    public static readonly namespace: string = "transport.datawalletSynchronized";

    public constructor(eventTargetAddress: string) {
        super(DatawalletSynchronizedEvent.namespace, eventTargetAddress, undefined);
    }
}
