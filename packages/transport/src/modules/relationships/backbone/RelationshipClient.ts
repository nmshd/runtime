import { TransportError } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetRelationshipsRequest, BackboneGetRelationshipsResponse } from "./BackboneGetRelationships";
import { BackbonePostRelationshipsRequest } from "./BackbonePostRelationship";
import { BackboneAcceptRelationshipsRequest, BackbonePutRelationshipsResponse } from "./BackbonePutRelationship";
import { BackboneRelationship } from "./BackboneRelationship";

export class RelationshipClient extends RESTClientAuthenticate {
    public async createRelationship(request: BackbonePostRelationshipsRequest): Promise<ClientResult<BackboneRelationship>> {
        const response = await this.post<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request);
        if (!response.value.creationContent) {
            throw new TransportError("The backbone has returned a relationship with no creation content.");
        }
        return response as ClientResult<BackboneRelationship>;
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

    public async getRelationships(request?: BackboneGetRelationshipsRequest): Promise<ClientResult<Paginator<BackboneRelationship>>> {
        const response = await this.getPaged<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request);
        response.value.collect();
    }

    public async getRelationship(relationshipId: string): Promise<ClientResult<BackboneRelationship>> {
        const response = await this.get<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}`);
        if (!response.value.creationContent) {
            throw new TransportError("The backbone has returned a relationship with no creation content.");
        }
        return response as ClientResult<BackboneRelationship>;
    }
}
