import { LocalAttributeDTO } from "../../dtos";
import { DataEvent } from "../DataEvent";

export class ForwardedAttributeDeletedByPeerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.forwardedAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(ForwardedAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
