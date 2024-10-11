export interface BackboneGetRelationshipTemplatesRequest {
    ids: string[];
}

export interface BackboneGetRelationshipTemplatesResponse {
    id: string;
    createdBy: string;
    createdByDevice: string;
    maxNumberOfAllocations: number | null;
    forIdentity: string | null;
    expiresAt: string | null;
    content: string;
    createdAt: string;
    deletedAt: string | null;
}

export interface RelationshipTemplateDateRange<T> {
    from?: T;
    to?: T;
}
