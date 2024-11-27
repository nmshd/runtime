import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneIsDeletedIdentityResponse } from "./BackboneIsDeletedIdentity";
import { BackbonePostIdentityRequest, BackbonePostIdentityResponse } from "./BackbonePostIdentity";

export class IdentityClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: BackbonePostIdentityRequest): Promise<ClientResult<BackbonePostIdentityResponse>> {
        return await this.post<BackbonePostIdentityResponse>("/api/v1/Identities", value, {});
    }

    public async checkIdentityDeletionForUsername(username: string): Promise<ClientResult<BackboneIsDeletedIdentityResponse>> {
        return await this.get<BackboneIsDeletedIdentityResponse>(`/api/v1/Identities/IsDeleted?username=${username}`);
    }
}
