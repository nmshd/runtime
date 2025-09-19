import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class AttributeForwardedSharingDetailsChangedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeForwardedSharingDetailsChanged";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeForwardedSharingDetailsChangedEvent.namespace, eventTargetAddress, data);
    }
}
