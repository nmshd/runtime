import { IdentityDeletionProcessDTO } from "../../types/transport/IdentityDeletionProcessDTO";
import { DataEvent } from "../DataEvent";

export class IdentityDeletionProcessStatusChangedEvent extends DataEvent<IdentityDeletionProcessDTO> {
    public static readonly namespace = "transport.identityDeletionProcessStatusChangedEvent";

    public constructor(eventTargetAddress: string, data: IdentityDeletionProcessDTO) {
        super(IdentityDeletionProcessStatusChangedEvent.namespace, eventTargetAddress, data);
    }
}
