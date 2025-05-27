import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetFilesRequest, BackboneGetFilesResponse } from "./BackboneGetFiles";
import { BackbonePostFilesRequest, BackbonePostFilesResponse } from "./BackbonePostFiles";

export class FileClient extends RESTClientAuthenticate {
    public async createFile(input: BackbonePostFilesRequest): Promise<ClientResult<BackbonePostFilesResponse>> {
        return await this.postMultipart<BackbonePostFilesResponse>("/api/v1/Files", input);
    }

    public async getFiles(request: BackboneGetFilesRequest): Promise<ClientResult<Paginator<BackboneGetFilesResponse>>> {
        return await this.getPaged<BackboneGetFilesResponse>("/api/v1/Files", request);
    }

    public async getFile(id: string): Promise<ClientResult<BackboneGetFilesResponse>> {
        return await this.get<BackboneGetFilesResponse>(`/api/v1/Files/${id}/metadata`);
    }

    public async deleteFile(id: string): Promise<ClientResult<void>> {
        return await this.delete<void>(`/api/v1/Files/${id}`);
    }

    public async downloadFile(id: string): Promise<ClientResult<Buffer | ArrayBuffer>> {
        return await this.download(`/api/v1/Files/${id}`);
    }

    public async validateOwnershipToken(id: string, ownershipToken: string): Promise<ClientResult<{ isValid: boolean }>> {
        return await this.post(`/api/v1/Files/${id}/ValidateOwnershipToken`, { fileOwnershipToken: ownershipToken });
    }

    public async regenerateOwnershipToken(id: string): Promise<ClientResult<{ newOwnershipToken: string }>> {
        return await this.patch(`/api/v1/Files/${id}/RegenerateOwnershipToken`, {});
    }
}
