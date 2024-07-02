import { ArbitraryRelationshipTemplateContentJSON, RelationshipTemplateContentJSON } from "@nmshd/content";

export type RelationshipTemplateContentDTO = RelationshipTemplateContentJSON | ArbitraryRelationshipTemplateContentJSON;

export interface RelationshipTemplateDTO {
    id: string;
    isOwn: boolean;
    createdBy: string;
    createdByDevice: string;
    createdAt: string;
    content: RelationshipTemplateContentDTO;
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    secretKey: string;
    truncatedReference: string;
}
