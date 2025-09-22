import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneCheckIfIdentityIsDeletedResponse } from "./BackboneCheckIfIdentityIsDeleted";
import { BackbonePostIdentityRequest, BackbonePostIdentityResponse } from "./BackbonePostIdentity";

export class IdentityClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: BackbonePostIdentityRequest): Promise<ClientResult<BackbonePostIdentityResponse>> {
        return await this.post<BackbonePostIdentityResponse>("/api/v2/Identities", value);
    }

    public async checkIfIdentityIsDeleted(username: string): Promise<ClientResult<BackboneCheckIfIdentityIsDeletedResponse>> {
        return await this.get<BackboneCheckIfIdentityIsDeletedResponse>(`/api/v2/Identities/IsDeleted?username=${username}`);
    }
}
