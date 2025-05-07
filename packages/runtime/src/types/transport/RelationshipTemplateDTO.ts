import { ArbitraryRelationshipTemplateContentJSON, RelationshipTemplateContentJSON } from "@nmshd/content";
import { PasswordProtectionDTO } from "./PasswordProtectionDTO";

export type RelationshipTemplateContentDerivation = RelationshipTemplateContentJSON | ArbitraryRelationshipTemplateContentJSON;

export interface RelationshipTemplateDTO {
    id: string;
    isOwn: boolean;
    createdBy: string;
    createdByDevice: string;
    createdAt: string;
    forIdentity?: string;
    passwordProtection?: PasswordProtectionDTO;
    content: RelationshipTemplateContentDerivation;
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    truncatedReference: string;
    url: string;
}
