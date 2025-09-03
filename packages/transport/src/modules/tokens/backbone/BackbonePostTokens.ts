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

export interface BackboneUpdateTokenContentRequest {
    id: string;
    newContent: string;
    password?: string;
}

export interface BackboneUpdateTokenContentResponse {
    id: string;
    expiresAt: string;
    createdAt: string;
    createdByDevice: string;
}
