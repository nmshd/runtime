import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class ForwardedAttributeDeletedEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.forwardedAttributeDeleted";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(ForwardedAttributeDeletedEvent.namespace, eventTargetAddress, data);
    }
}
