export interface BackboneGetTokensRequest {
    tokens: { id: string; password?: string }[];
}

export interface BackboneGetTokensResponse {
    id: string;
    content?: string;
    createdAt: string;
    createdBy?: string;
    createdByDevice?: string;
    expiresAt: string;
    forIdentity?: string;
}
