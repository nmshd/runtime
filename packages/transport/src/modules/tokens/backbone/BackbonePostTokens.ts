export interface BackbonePostTokensRequest {
    content: string;
    expiresAt: string;
    forIdentity?: string;
    password?: string;
}

export interface BackbonePostTokensResponse {
    id: string;
    createdAt: string;
}
