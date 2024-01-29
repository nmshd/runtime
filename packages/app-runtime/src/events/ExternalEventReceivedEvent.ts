import { DataEvent, MessageDTO, RelationshipDTO } from "@nmshd/runtime";

export class ExternalEventReceivedEvent extends DataEvent<{
    messages: MessageDTO[];
    relationships: RelationshipDTO[];
}> {
    public static readonly namespace: string = "app.externalEventReceived";

    public constructor(address: string, messages: MessageDTO[], relationships: RelationshipDTO[]) {
        super(ExternalEventReceivedEvent.namespace, address, {
            messages,
            relationships
        });
    }
}
