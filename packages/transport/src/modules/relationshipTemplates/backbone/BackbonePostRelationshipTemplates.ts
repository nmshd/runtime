export interface BackbonePostRelationshipTemplatesRequest {
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    content: string;
}

export interface BackbonePostRelationshipTemplatesResponse {
    id: string;
    createdAt: string;
}
