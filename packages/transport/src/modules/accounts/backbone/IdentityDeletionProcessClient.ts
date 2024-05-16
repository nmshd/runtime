import { RESTClientAuthenticate, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneIdentityDeletionProcess } from "./BackboneIdentityDeletionProcess";

export class IdentityDeletionProcessClient extends RESTClientAuthenticate {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async initiateIdentityDeletionProcess(): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.post<BackboneIdentityDeletionProcess>("/api/v1/Identities/Self/DeletionProcesses", {});
    }

    public async getIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.get<BackboneIdentityDeletionProcess>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}`);
    }

    public async cancelIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.put<BackboneIdentityDeletionProcess>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Cancel`, {});
    }

    public async approveIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.put<BackboneIdentityDeletionProcess>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Approve`, {});
    }

    public async rejectIdentityDeletionProcess(identityDeletionProcessId: string): Promise<ClientResult<BackboneIdentityDeletionProcess>> {
        return await this.put<BackboneIdentityDeletionProcess>(`/api/v1/Identities/Self/DeletionProcesses/${identityDeletionProcessId}/Reject`, {});
    }
}
