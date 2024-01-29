export interface BackbonePostMessagesRequest {
    recipients: BackbonePostMessagesRecipientRequest[];
    body: string;
    attachments: BackbonePostMessagesAttachmentRequest[];
}

export interface BackbonePostMessagesRecipientRequest {
    address: string;
    encryptedKey: string;
}

export interface BackbonePostMessagesAttachmentRequest {
    id: string;
}

export interface BackbonePostMessagesResponse {
    id: string;
    createdAt: string;
}
