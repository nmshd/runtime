import { LocalAttributeDTO, LocalAttributeListenerDTO, LocalRequestDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export interface AttributeListenerTriggeredEventData {
    attributeListener: LocalAttributeListenerDTO;
    attribute: LocalAttributeDTO;
    request: LocalRequestDTO;
}

export class AttributeListenerTriggeredEvent extends DataEvent<AttributeListenerTriggeredEventData> {
    public static readonly namespace = "consumption.attributeListenerTriggered";

    public constructor(eventTargetAddress: string, data: AttributeListenerTriggeredEventData) {
        super(AttributeListenerTriggeredEvent.namespace, eventTargetAddress, data);
    }
}
