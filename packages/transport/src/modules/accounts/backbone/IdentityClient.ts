import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneCheckDeletionOfIdentityResponse } from "./BackboneCheckDeletionOfIdentity";
import { BackbonePostIdentityRequest, BackbonePostIdentityResponse } from "./BackbonePostIdentity";

export class IdentityClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: BackbonePostIdentityRequest): Promise<ClientResult<BackbonePostIdentityResponse>> {
        return await this.post<BackbonePostIdentityResponse>("/api/v1/Identities", value);
    }

    public async checkDeletionOfIdentity(username: string): Promise<ClientResult<BackboneCheckDeletionOfIdentityResponse>> {
        return await this.get<BackboneCheckDeletionOfIdentityResponse>(`/api/v1/Identities/IsDeleted?username=${username}`);
    }
}
