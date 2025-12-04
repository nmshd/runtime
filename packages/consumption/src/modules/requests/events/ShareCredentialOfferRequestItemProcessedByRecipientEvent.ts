import { CoreAddress } from "@nmshd/core-types";
import { TransportDataEvent } from "@nmshd/transport";

export interface ShareCredentialOfferRequestItemProcessedByRecipientEventData {
    credentialOfferUrl: string;
    accepted: boolean;
    peer: CoreAddress;
}

export class ShareCredentialOfferRequestItemProcessedByRecipientEvent extends TransportDataEvent<ShareCredentialOfferRequestItemProcessedByRecipientEventData> {
    public static readonly namespace = "consumption.shareCredentialOfferRequestItemProcessedByRecipientEvent";

    public constructor(eventTargetAddress: string, data: ShareCredentialOfferRequestItemProcessedByRecipientEventData) {
        super(ShareCredentialOfferRequestItemProcessedByRecipientEvent.namespace, eventTargetAddress, data);
    }
}
