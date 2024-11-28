import { DataEvent } from "../DataEvent";

export class DatawalletSynchronizedEvent extends DataEvent<any> {
    public static readonly namespace: string = "transport.datawalletSynchronized";

    public constructor(eventTargetAddress: string) {
        super(DatawalletSynchronizedEvent.namespace, eventTargetAddress, undefined);
    }
}
