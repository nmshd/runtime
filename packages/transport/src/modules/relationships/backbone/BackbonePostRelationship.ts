import { BackboneRelationship } from "./BackboneRelationship.js";

export interface BackbonePostRelationshipsRequest {
    relationshipTemplateId: string;
    creationContent: string;
}

export type BackbonePostRelationshipsResponse = Omit<BackboneRelationship, "creationContent" | "creationResponseContent">;
