export interface BackboneDatawalletModification {
    id: string;
    index: number;
    objectIdentifier: string;
    payloadCategory: string | null;
    createdAt: string;
    createdByDevice: string;
    collection: string;
    type: string;
    encryptedPayload: string | null;
    datawalletVersion: number;
}
