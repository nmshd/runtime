import { LocalAttributeDTO } from "../../dtos";
import { DataEvent } from "../DataEvent";

export class AttributeWasViewedAtChangedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeWasViewedAtChanged";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeWasViewedAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
