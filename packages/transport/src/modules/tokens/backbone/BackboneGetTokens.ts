export interface BackboneGetTokensRequest {
    ids: string[];
}

export interface BackboneGetTokensResponse {
    id: string;
    content: string;
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    expiresAt: string;
}
