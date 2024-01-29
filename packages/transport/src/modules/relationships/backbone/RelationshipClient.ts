import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetRelationshipsRequest, BackboneGetRelationshipsResponse } from "./BackboneGetRelationships";
import { BackboneGetRelationshipsChangesRequest, BackboneGetRelationshipsChangesResponse } from "./BackboneGetRelationshipsChanges";
import { BackbonePostRelationshipsChangesRequest, BackbonePostRelationshipsRequest } from "./BackbonePostRelationshipsChanges";

export class RelationshipClient extends RESTClientAuthenticate {
    public async createRelationship(request: BackbonePostRelationshipsRequest): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.post<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request);
    }

    public async createRelationshipChange(id: string, request: BackbonePostRelationshipsChangesRequest): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.post<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${id}/Changes`, request);
    }

    public async acceptRelationshipChange(relationshipId: string, changeId: string, content?: any): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.put<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Changes/${changeId}/Accept`, {
            content: content
        });
    }

    public async rejectRelationshipChange(relationshipId: string, changeId: string, content?: any): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.put<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Changes/${changeId}/Reject`, {
            content: content
        });
    }

    public async revokeRelationshipChange(relationshipId: string, changeId: string, content?: any): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.put<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Changes/${changeId}/Revoke`, {
            content: content
        });
    }

    public async getRelationships(request?: BackboneGetRelationshipsRequest): Promise<ClientResult<Paginator<BackboneGetRelationshipsResponse>>> {
        return await this.getPaged<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request);
    }

    public async getRelationship(relationshipId: string): Promise<ClientResult<BackboneGetRelationshipsResponse>> {
        return await this.get<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}`);
    }

    public async getRelationshipChanges(request?: BackboneGetRelationshipsChangesRequest): Promise<ClientResult<Paginator<BackboneGetRelationshipsChangesResponse>>> {
        return await this.getPaged<BackboneGetRelationshipsChangesResponse>("/api/v1/Relationships/Changes", request);
    }

    public async getRelationshipChange(relationshipChangeId: string): Promise<ClientResult<BackboneGetRelationshipsChangesResponse>> {
        const change = await this.get<BackboneGetRelationshipsChangesResponse>(`/api/v1/Relationships/Changes/${relationshipChangeId}`);
        return change;
    }
}
