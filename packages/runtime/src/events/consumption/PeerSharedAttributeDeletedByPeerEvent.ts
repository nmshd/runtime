import { LocalAttributeDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class PeerSharedAttributeDeletedByPeerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.peerSharedAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(PeerSharedAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
