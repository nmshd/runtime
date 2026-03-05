import { RelationshipTemplateDTO } from "@nmshd/runtime-types";
import { DataEvent } from "@nmshd/runtime-types/src/events/DataEvent";

export class PeerRelationshipTemplateLoadedEvent extends DataEvent<RelationshipTemplateDTO> {
    public static readonly namespace = "transport.peerRelationshipTemplateLoaded";

    public constructor(eventTargetAddress: string, data: RelationshipTemplateDTO) {
        super(PeerRelationshipTemplateLoadedEvent.namespace, eventTargetAddress, data);
    }
}
