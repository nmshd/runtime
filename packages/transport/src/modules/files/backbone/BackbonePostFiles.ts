export interface BackbonePostFilesRequest {
    content: Uint8Array;
    cipherHash: string;
    owner: string;
    ownerSignature: string;
    expiresAt: string;
    encryptedProperties: string;
}

export interface BackbonePostFilesResponse {
    id: string;
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    modifiedAt: string;
    modifiedBy: string;
    modifiedByDevice: string;
    deletedAt: string;
    deletedBy: string;
    deletedByDevice: string;
    owner: string;
    ownerSignature: string;
    cipherSize: number;
    cipherHash: string;
    expiresAt: string;
    ownershipToken: string;
}
