import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClient, RESTClientLogDirective } from "../../../core/index.js";
import { BackboneCheckIfIdentityIsDeletedResponse } from "./BackboneCheckIfIdentityIsDeleted.js";
import { BackbonePostIdentityRequest, BackbonePostIdentityResponse } from "./BackbonePostIdentity.js";

export class IdentityClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: BackbonePostIdentityRequest): Promise<ClientResult<BackbonePostIdentityResponse>> {
        return await this.post<BackbonePostIdentityResponse>("/api/v2/Identities", value);
    }

    public async checkIfIdentityIsDeleted(username: string): Promise<ClientResult<BackboneCheckIfIdentityIsDeletedResponse>> {
        return await this.get<BackboneCheckIfIdentityIsDeletedResponse>(`/api/v2/Identities/IsDeleted?username=${username}`);
    }
}
