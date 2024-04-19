import { RESTClientAuthenticate, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { IdentityDeletionProcessJSON } from "../data/IdentityDeletionProcess";
import { BackboneIdentityPostRequest, BackboneIdentityPostResponse } from "./BackbonePostIdentity";

export class IdentityAuthClient extends RESTClientAuthenticate {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: BackboneIdentityPostRequest): Promise<ClientResult<BackboneIdentityPostResponse>> {
        return await this.post<BackboneIdentityPostResponse>("/api/v1/Identities", value, {});
    }

    public async initiateIdentityDeletion(): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.post<IdentityDeletionProcessJSON>("/api/v1/Identities/Self/DeletionProcess", {});
    }
}
