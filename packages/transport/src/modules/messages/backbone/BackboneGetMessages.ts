export interface BackboneGetMessagesRequest {
    ids: string[];
}

export interface BackboneGetMessagesDateRange<T> {
    from?: T;
    to?: T;
}

export interface BackboneGetMessagesResponse {
    id: string;
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    body: string;
    attachments: BackboneGetMessagesAttachmentResponse[];
    recipients: BackboneGetMessagesRecipientResponse[];
}

export interface BackboneGetMessagesAttachmentResponse {
    id: string;
}

export interface BackboneGetMessagesRecipientResponse {
    address: string;
    encryptedKey: string;
    receivedAt: string | null;
    receivedByDevice: string | null;
}
