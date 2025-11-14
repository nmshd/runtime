import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClientAuthenticate, RESTClientLogDirective } from "../../../core/index.js";
import { BackboneIdentityDeletionProcess } from "./BackboneIdentityDeletionProcess.js";
import { BackbonePostIdentityDeletionProcessRequest } from "./BackbonePostIdentityDeletionProcess.js";

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
