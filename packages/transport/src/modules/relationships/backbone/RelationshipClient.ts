import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetRelationshipResponse, BackboneGetRelationshipsRequest } from "./BackboneGetRelationships";
import { BackbonePostRelationshipsRequest, BackbonePostRelationshipsResponse } from "./BackbonePostRelationship";
import { BackboneAcceptRelationshipsRequest, BackbonePutRelationshipsResponse } from "./BackbonePutRelationship";

export class RelationshipClient extends RESTClientAuthenticate {
    public async createRelationship(request: BackbonePostRelationshipsRequest): Promise<ClientResult<BackbonePostRelationshipsResponse>> {
        return await this.post<BackbonePostRelationshipsResponse>("/api/v1/Relationships", request);
    }

    public async acceptRelationship(relationshipId: string, request: BackboneAcceptRelationshipsRequest): Promise<ClientResult<BackbonePutRelationshipsResponse>> {
        return await this.put<BackbonePutRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Accept`, request);
    }

    public async rejectRelationship(relationshipId: string): Promise<ClientResult<BackbonePutRelationshipsResponse>> {
        return await this.put<BackbonePutRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Reject`, {});
    }

    public async revokeRelationship(relationshipId: string): Promise<ClientResult<BackbonePutRelationshipsResponse>> {
        return await this.put<BackbonePutRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Revoke`, {});
    }

    public async reactivateRelationship(relationshipId: string): Promise<ClientResult<BackbonePutRelationshipsResponse>> {
        return await this.put<BackbonePutRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Reactivate`, {});
    }

    public async acceptRelationshipActivation(relationshipId: string): Promise<ClientResult<BackbonePutRelationshipsResponse>> {
        return await this.put<BackbonePutRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Reactivate/Accept`, {});
    }

    public async rejectRelationshipActivation(relationshipId: string): Promise<ClientResult<BackbonePutRelationshipsResponse>> {
        return await this.put<BackbonePutRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Reactivate/Reject`, {});
    }

    public async revokeRelationshipActivation(relationshipId: string): Promise<ClientResult<BackbonePutRelationshipsResponse>> {
        return await this.put<BackbonePutRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}/Reactivate/Revoke`, {});
    }
    public async decomposeRelationship(relationshipId: string): Promise<ClientResult<void>> {
        return await this.put<void>(`/api/v1/Relationships/${relationshipId}/Decompose`, {});
    }

    public async getRelationships(request?: BackboneGetRelationshipsRequest): Promise<ClientResult<Paginator<BackboneGetRelationshipResponse>>> {
        return await this.getPaged<BackboneGetRelationshipResponse>("/api/v1/Relationships", request);
    }

    public async getRelationship(relationshipId: string): Promise<ClientResult<BackboneGetRelationshipResponse>> {
        return await this.get<BackboneGetRelationshipResponse>(`/api/v1/Relationships/${relationshipId}`);
    }
}
