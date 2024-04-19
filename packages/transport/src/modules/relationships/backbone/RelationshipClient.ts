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
        try {
            return (await this.post<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request)) as ClientResult<BackboneRelationship>;
        } catch {
            throw new TransportError("The backbone has returned a relationship with no creation content.");
        }
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
        try {
            return (await this.getPaged<BackboneGetRelationshipsResponse>("/api/v1/Relationships", request)) as ClientResult<Paginator<BackboneRelationship>>;
        } catch {
            throw new TransportError("The backbone has returned a relationship with no creation content.");
        }
    }

    public async getRelationship(relationshipId: string): Promise<ClientResult<BackboneRelationship>> {
        try {
            return (await this.get<BackboneGetRelationshipsResponse>(`/api/v1/Relationships/${relationshipId}`)) as ClientResult<BackboneRelationship>;
        } catch {
            throw new TransportError("The backbone has returned a relationship with no creation content.");
        }
    }
}
