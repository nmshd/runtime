import { DataEvent as tsUtilsDataEvent } from "@js-soft/ts-utils";

export class DataEvent<T> extends tsUtilsDataEvent<T> {
    public constructor(
        namespace: string,
        public readonly eventTargetAddress: string,
        data: T
    ) {
        super(namespace, data);
    }
}
