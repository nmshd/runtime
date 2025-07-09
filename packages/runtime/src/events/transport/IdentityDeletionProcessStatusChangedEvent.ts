import { IdentityDeletionProcessDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class IdentityDeletionProcessStatusChangedEvent extends DataEvent<IdentityDeletionProcessDTO | undefined> {
    public static readonly namespace = "transport.identityDeletionProcessStatusChanged";

    public constructor(eventTargetAddress: string, data?: IdentityDeletionProcessDTO) {
        super(IdentityDeletionProcessStatusChangedEvent.namespace, eventTargetAddress, data);
    }
}
