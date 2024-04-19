import { BackbonePutRelationshipsResponse } from "./BackbonePutRelationship";

export interface BackboneGetRelationshipsRequest {
    ids: string[];
}

export interface BackboneGetRelationshipsResponse extends BackbonePutRelationshipsResponse {
    creationContent?: string;
    acceptanceContent?: string;
}

export interface BackboneGetRelationshipsDateRange<T> {
    from?: T;
    to?: T;
}
