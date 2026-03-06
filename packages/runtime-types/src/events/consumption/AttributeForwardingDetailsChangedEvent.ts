import { LocalAttributeDTO } from "../../dtos";
import { DataEvent } from "../DataEvent";

export class AttributeForwardingDetailsChangedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeForwardingDetailsChanged";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeForwardingDetailsChangedEvent.namespace, eventTargetAddress, data);
    }
}
