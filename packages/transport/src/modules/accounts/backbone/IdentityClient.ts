import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackbonePostIdentityRequest, BackbonePostIdentityResponse } from "./BackbonePostIdentity";

export class IdentityClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: BackbonePostIdentityRequest): Promise<ClientResult<BackbonePostIdentityResponse>> {
        return await this.post<BackbonePostIdentityResponse>("/api/v1/Identities", value, {});
    }
}
