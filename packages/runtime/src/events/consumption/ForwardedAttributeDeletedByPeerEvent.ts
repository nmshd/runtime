import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class ForwardedAttributeDeletedByPeerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.forwardedAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(ForwardedAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
