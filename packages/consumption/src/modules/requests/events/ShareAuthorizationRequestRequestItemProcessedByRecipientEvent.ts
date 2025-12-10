import { CoreAddress } from "@nmshd/core-types";
import { TransportDataEvent } from "@nmshd/transport";

export interface ShareAuthorizationRequestRequestItemProcessedByRecipientEventData {
    authorizationRequestUrl: string;
    accepted: boolean;
    peer: CoreAddress;
}

export class ShareAuthorizationRequestRequestItemProcessedByRecipientEvent extends TransportDataEvent<ShareAuthorizationRequestRequestItemProcessedByRecipientEventData> {
    public static readonly namespace = "consumption.shareAuthorizationRequestRequestItemProcessedByRecipient";

    public constructor(eventTargetAddress: string, data: ShareAuthorizationRequestRequestItemProcessedByRecipientEventData) {
        super(ShareAuthorizationRequestRequestItemProcessedByRecipientEvent.namespace, eventTargetAddress, data);
    }
}
