import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetFilesRequest, BackboneGetFilesResponse } from "./BackboneGetFiles";
import { BackbonePostFilesRequest, BackbonePostFilesResponse } from "./BackbonePostFiles";

export class FileClient extends RESTClientAuthenticate {
    public async createFile(input: BackbonePostFilesRequest): Promise<ClientResult<BackbonePostFilesResponse>> {
        return await this.postMultipart<BackbonePostFilesResponse>("/api/v2/Files", input);
    }

    public async getFiles(request: BackboneGetFilesRequest): Promise<ClientResult<Paginator<BackboneGetFilesResponse>>> {
        return await this.getPaged<BackboneGetFilesResponse>("/api/v2/Files", request);
    }

    public async getFile(id: string): Promise<ClientResult<BackboneGetFilesResponse>> {
        return await this.get<BackboneGetFilesResponse>(`/api/v2/Files/${id}/metadata`);
    }

    public async deleteFile(id: string): Promise<ClientResult<void>> {
        return await this.delete<void>(`/api/v2/Files/${id}`);
    }

    public async downloadFile(id: string): Promise<ClientResult<Buffer | ArrayBuffer>> {
        return await this.download(`/api/v2/Files/${id}`);
    }

    public async validateFileOwnershipToken(id: string, ownershipToken: string): Promise<ClientResult<{ isValid: boolean }>> {
        return await this.post(`/api/v2/Files/${id}/ValidateOwnershipToken`, { ownershipToken });
    }

    public async regenerateFileOwnershipToken(id: string): Promise<ClientResult<{ newOwnershipToken: string }>> {
        return await this.patch(`/api/v2/Files/${id}/RegenerateOwnershipToken`);
    }

    public async claimFileOwnership(id: string, ownershipToken: string): Promise<ClientResult<{ newOwnershipToken: string }>> {
        return await this.patch(`/api/v2/Files/${id}/ClaimOwnership`, { ownershipToken });
    }
}
