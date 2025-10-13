import { RESTClientAuthenticate, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneIdentityDeletionProcess } from "./BackboneIdentityDeletionProcess";
import { BackbonePostIdentityDeletionProcessRequest } from "./BackbonePostIdentityDeletionProcess";

export class IdentityDeletionProcessClient extends RESTClientAuthenticate {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async initiateIdentityDeletionProcess(value: BackbonePostIdentityDeletionProcessRequest): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.post<BackboneIdentityDeletionProcess>("/api/v2/Identities/Self/DeletionProcesses", value);
    }

    public async getIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.get<BackboneIdentityDeletionProcess>(`/api/v2/Identities/Self/DeletionProcesses/${identityDeletionProcessId}`);
    }

    public async cancelIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.put<BackboneIdentityDeletionProcess>(`/api/v2/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Cancel`, {});
    }
}
