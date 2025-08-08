import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class PeerRelationshipAttributeDeletedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.peerRelationshipAttributeDeleted";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(PeerRelationshipAttributeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
