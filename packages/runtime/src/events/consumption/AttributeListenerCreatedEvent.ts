import { LocalAttributeListenerDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class AttributeListenerCreatedEvent extends DataEvent<LocalAttributeListenerDTO> {
    public static readonly namespace = "consumption.attributeListenerCreated";

    public constructor(eventTargetAddress: string, data: LocalAttributeListenerDTO) {
        super(AttributeListenerCreatedEvent.namespace, eventTargetAddress, data);
    }
}
