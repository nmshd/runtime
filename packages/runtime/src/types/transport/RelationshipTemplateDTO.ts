import { ArbitraryRelationshipTemplateContentJSON, RelationshipTemplateContentContainingRequestJSON } from "@nmshd/content";

export interface RelationshipTemplateDTO {
    id: string;
    isOwn: boolean;
    createdBy: string;
    createdByDevice: string;
    createdAt: string;
    content: RelationshipTemplateContentContainingRequestJSON | ArbitraryRelationshipTemplateContentJSON;
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    secretKey: string;
    truncatedReference: string;
}
