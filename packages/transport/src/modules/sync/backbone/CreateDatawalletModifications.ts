export interface CreateDatawalletModificationsRequest {
    localIndex?: number;
    modifications: CreateDatawalletModificationsRequestItem[];
}

export interface CreateDatawalletModificationsRequestItem {
    objectIdentifier: string;
    payloadCategory?: string;
    collection: string;
    type: string;
    encryptedPayload?: string;
    datawalletVersion: number;
}

export interface CreateDatawalletModificationsResponse {
    newIndex: number;
    modifications: {
        id: string;
        index: number;
        createdAt: string;
    }[];
}
