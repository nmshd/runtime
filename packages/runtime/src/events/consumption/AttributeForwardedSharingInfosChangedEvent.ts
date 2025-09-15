import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class AttributeForwardedSharingInfosChangedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.attributeForwardedSharingInfosChanged";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(AttributeForwardedSharingInfosChangedEvent.namespace, eventTargetAddress, data);
    }
}
