export interface BackbonePostRelationshipTemplatesRequest {
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    forIdentity?: string;
    content: string;
}

export interface BackbonePostRelationshipTemplatesResponse {
    id: string;
    createdAt: string;
}
