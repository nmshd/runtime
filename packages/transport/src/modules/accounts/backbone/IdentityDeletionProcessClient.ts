import { RESTClientAuthenticate, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { IdentityDeletionProcessJSON } from "../data/IdentityDeletionProcess";

export class IdentityDeletionProcessClient extends RESTClientAuthenticate {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async initiateIdentityDeletionProcess(): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.post<IdentityDeletionProcessJSON>("/api/v1/Identities/Self/DeletionProcesses", {});
    }

    public async getIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.get<IdentityDeletionProcessJSON>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}`);
    }

    public async cancelIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.put<IdentityDeletionProcessJSON>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Cancel`, {});
    }

    public async approveIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.put<IdentityDeletionProcessJSON>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Approve`, {});
    }

    public async rejectIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<IdentityDeletionProcessJSON>> {
        return await this.put<IdentityDeletionProcessJSON>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Reject`, {});
    }
}
