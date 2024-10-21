import { ArbitraryRelationshipTemplateContentJSON, RelationshipTemplateContentJSON } from "@nmshd/content";

export type RelationshipTemplateContentDerivation = RelationshipTemplateContentJSON | ArbitraryRelationshipTemplateContentJSON;

export interface RelationshipTemplateDTO {
    id: string;
    isOwn: boolean;
    createdBy: string;
    createdByDevice: string;
    createdAt: string;
    forIdentity?: string;
    password?: string;
    content: RelationshipTemplateContentDerivation;
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    truncatedReference: string;
}
