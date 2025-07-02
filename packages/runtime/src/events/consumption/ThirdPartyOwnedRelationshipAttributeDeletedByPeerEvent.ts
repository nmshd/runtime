import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

/**
 * @deprecated Use ThirdPartyRelationshipAttributeDeletedByPeerEvent instead.
 */
export class ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.thirdPartyOwnedRelationshipAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
