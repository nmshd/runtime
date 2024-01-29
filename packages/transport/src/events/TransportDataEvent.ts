import { DataEvent } from "@js-soft/ts-utils";

export abstract class TransportDataEvent<T> extends DataEvent<T> {
    public constructor(
        namespace: string,
        public readonly eventTargetAddress: string,
        data: T
    ) {
        super(namespace, data);
    }
}
