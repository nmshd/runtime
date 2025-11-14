import { BackboneRelationship } from "./BackboneRelationship.js";

export interface BackboneAcceptRelationshipsRequest {
    creationResponseContent: string;
}

export type BackbonePutRelationshipsResponse = Omit<BackboneRelationship, "creationContent" | "creationResponseContent">;
