export interface BackboneGetFilesRequest {
    ids: string[];
}

export interface BackboneGetFilesResponse {
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
    encryptedProperties: string;
}
