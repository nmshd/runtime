import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class OwnAttributeDeletedByOwnerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.ownAttributeDeletedByOwner";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(OwnAttributeDeletedByOwnerEvent.namespace, eventTargetAddress, data);
    }
}
