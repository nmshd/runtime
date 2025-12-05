import { DataEvent } from "../DataEvent";

export interface ShareCredentialOfferRequestItemProcessedByRecipientEventData {
    credentialOfferUrl: string;
    accepted: boolean;
    peer: string;
}

export class ShareCredentialOfferRequestItemProcessedByRecipientEvent extends DataEvent<ShareCredentialOfferRequestItemProcessedByRecipientEventData> {
    public static readonly namespace = "consumption.shareCredentialOfferRequestItemProcessedByRecipient";

    public constructor(eventTargetAddress: string, data: ShareCredentialOfferRequestItemProcessedByRecipientEventData) {
        super(ShareCredentialOfferRequestItemProcessedByRecipientEvent.namespace, eventTargetAddress, data);
    }
}
