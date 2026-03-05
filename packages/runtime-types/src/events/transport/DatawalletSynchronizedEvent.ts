import { DataEvent } from "@nmshd/runtime-types/src/events/DataEvent";

export class DatawalletSynchronizedEvent extends DataEvent<undefined> {
    public static readonly namespace: string = "transport.datawalletSynchronized";

    public constructor(eventTargetAddress: string) {
        super(DatawalletSynchronizedEvent.namespace, eventTargetAddress, undefined);
    }
}
