import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class OwnSharedAttributeDeletedByOwnerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.ownSharedAttributeDeletedByOwner";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(OwnSharedAttributeDeletedByOwnerEvent.namespace, eventTargetAddress, data);
    }
}
