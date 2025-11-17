import { RelationshipTemplate } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class PeerRelationshipTemplateLoadedEvent extends TransportDataEvent<RelationshipTemplate> {
    public static readonly namespace = "transport.peerRelationshipTemplateLoaded";

    public constructor(eventTargetAddress: string, data: RelationshipTemplate) {
        super(PeerRelationshipTemplateLoadedEvent.namespace, eventTargetAddress, data);
    }
}
