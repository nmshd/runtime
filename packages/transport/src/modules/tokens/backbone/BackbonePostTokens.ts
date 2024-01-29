export interface BackbonePostTokensRequest {
    content: string;
    expiresAt: string;
}

export interface BackbonePostTokensResponse {
    id: string;
    createdAt: string;
    createdByDevice: string;
}
