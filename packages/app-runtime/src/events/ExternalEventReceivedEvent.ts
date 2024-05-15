import { DataEvent, SyncEverythingResponse } from "@nmshd/runtime";

export class ExternalEventReceivedEvent extends DataEvent<SyncEverythingResponse> {
    public static readonly namespace: string = "app.externalEventReceived";

    public constructor(address: string, syncEverythingResponse: SyncEverythingResponse) {
        super(ExternalEventReceivedEvent.namespace, address, syncEverythingResponse);
    }
}
