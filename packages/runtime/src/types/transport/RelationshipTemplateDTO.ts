export interface RelationshipTemplateDTO {
    id: string;
    isOwn: boolean;
    createdBy: string;
    createdByDevice: string;
    createdAt: string;
    content: any;
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    secretKey: string;
    truncatedReference: string;
}
