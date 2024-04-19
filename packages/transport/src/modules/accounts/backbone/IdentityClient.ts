import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneIdentityPostRequest, BackboneIdentityPostResponse } from "./BackbonePostIdentity";

export class IdentityClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: BackboneIdentityPostRequest): Promise<ClientResult<BackboneIdentityPostResponse>> {
        return await this.post<BackboneIdentityPostResponse>("/api/v1/Identities", value, {});
    }
}
