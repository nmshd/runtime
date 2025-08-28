import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class AttributeForwardedSharingInfoChangedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeForwardedSharingInfoChanged";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeForwardedSharingInfoChangedEvent.namespace, eventTargetAddress, data);
    }
}
