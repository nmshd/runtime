import { BackboneRelationship } from "./BackboneRelationship";

export interface BackboneAcceptRelationshipsRequest {
    creationResponseContent: string;
}

export type BackbonePutRelationshipsResponse = Omit<BackboneRelationship, "creationContent" | "creationResponseContent">;
