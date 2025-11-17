import { BackboneRelationship } from "./BackboneRelationship.js";

export interface BackboneGetRelationshipsRequest {
    ids: string[];
}

export type BackboneGetRelationshipResponse = BackboneRelationship;

export interface BackboneGetRelationshipsDateRange<T> {
    from?: T;
    to?: T;
}
