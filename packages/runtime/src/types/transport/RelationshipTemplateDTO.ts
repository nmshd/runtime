import { ArbitraryRelationshipTemplateContentJSON, RelationshipTemplateContentJSON } from "@nmshd/content";

export type RelationshipTemplateContentDerivationDTO = RelationshipTemplateContentJSON | ArbitraryRelationshipTemplateContentJSON;

export interface RelationshipTemplateDTO {
    id: string;
    isOwn: boolean;
    createdBy: string;
    createdByDevice: string;
    createdAt: string;
    content: RelationshipTemplateContentDerivationDTO;
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    secretKey: string;
    truncatedReference: string;
}
