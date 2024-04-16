import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneAcceptRelationshipsRequest } from "./BackboneAcceptRelationship";
import { BackboneGetRelationshipsRequest, BackboneGetRelationshipsResponse } from "./BackboneGetRelationships";
import { BackbonePostRelationshipsRequest } from "./BackbonePostRelationship";

export class RelationshipClient extends RESTClientAuthenticate {
    public async createRelationship(request: BackbonePostRelationshipsRequest): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.post<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request);
    }

    public async acceptRelationship(relationshipId: string, request: BackboneAcceptRelationshipsRequest): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.put<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Accept`, request);
    }

    public async rejectRelationship(relationshipId: string): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.put<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Reject`);
    }

    public async revokeRelationship(relationshipId: string): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.put<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Revoke`);
    }

    public async getRelationships(request?: BackboneGetRelationshipsRequest): Promise<ClientResult<Paginator<BackboneGetRelationshipsResponse>>> {
        return await this.getPaged<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request);
    }

    public async getRelationship(relationshipId: string): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.get<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}`);
    }
}
