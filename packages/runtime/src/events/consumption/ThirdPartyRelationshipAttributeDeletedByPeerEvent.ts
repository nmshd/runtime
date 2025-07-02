import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class ThirdPartyRelationshipAttributeDeletedByPeerEvent extends DataEvent<LocalAttributeDTO> {
    public static readonly namespace = "consumption.thirdPartyRelationshipAttributeDeletedByPeer";

    public constructor(eventTargetAddress: string, data: LocalAttributeDTO) {
        super(ThirdPartyRelationshipAttributeDeletedByPeerEvent.namespace, eventTargetAddress, data);
    }
}
