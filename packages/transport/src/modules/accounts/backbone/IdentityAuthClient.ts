import { RESTClientAuthenticate, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { IdentityDeletionProcessJSON } from "../data/IdentityDeletionProcess";

export class IdentityAuthClient extends RESTClientAuthenticate {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async initiateIdentityDeletion(): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.post<IdentityDeletionProcessJSON>("/api/v1/Identities/Self/DeletionProcesses", {});
    }

    public async getIdentityDeletionProcesses(): Promise<ClientResult<IdentityDeletionProcessJSON[]>> {
        return await this.get<IdentityDeletionProcessJSON[]>("/api/v1/Identities/Self/DeletionProcesses");
    }

    public async getIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.get<IdentityDeletionProcessJSON>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}`);
    }

    public async cancelIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.put<IdentityDeletionProcessJSON>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Cancel`, {});
    }
}
