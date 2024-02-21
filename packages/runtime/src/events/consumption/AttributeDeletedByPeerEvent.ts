import { LocalAttributeDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class AttributeDeletedByPeerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
