import { DataEvent } from "@nmshd/runtime";

export class DatawalletSynchronizedEvent extends DataEvent<any> {
    public static readonly namespace: string = "app.datawalletSynchronized";

    public constructor(address: string) {
        super(DatawalletSynchronizedEvent.namespace, address, undefined);
    }
}
