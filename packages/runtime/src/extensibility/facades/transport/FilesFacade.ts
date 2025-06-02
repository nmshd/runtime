import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { FileDTO, TokenDTO } from "../../../types";
import {
    CreateTokenForFileRequest,
    CreateTokenForFileUseCase,
    DeleteFileRequest,
    DeleteFileUseCase,
    DownloadFileRequest,
    DownloadFileResponse,
    DownloadFileUseCase,
    GetFileRequest,
    GetFileUseCase,
    GetFilesRequest,
    GetFilesUseCase,
    GetOrLoadFileRequest,
    GetOrLoadFileUseCase,
    RegenerateFileOwnershipTokenRequest,
    RegenerateFileOwnershipTokenUseCase,
    UploadOwnFileRequest,
    UploadOwnFileUseCase
} from "../../../useCases";

export class FilesFacade {
    public constructor(
        @Inject private readonly uploadOwnFileUseCase: UploadOwnFileUseCase,
        @Inject private readonly getOrLoadFileUseCase: GetOrLoadFileUseCase,
        @Inject private readonly getFilesUseCase: GetFilesUseCase,
        @Inject private readonly downloadFileUseCase: DownloadFileUseCase,
        @Inject private readonly getFileUseCase: GetFileUseCase,
        @Inject private readonly deleteFileUseCase: DeleteFileUseCase,
        @Inject private readonly createTokenForFileUseCase: CreateTokenForFileUseCase,
        @Inject private readonly regenerateFileOwnershipTokenUseCase: RegenerateFileOwnershipTokenUseCase
    ) {}

    public async getFiles(request: GetFilesRequest): Promise<Result<FileDTO[]>> {
        return await this.getFilesUseCase.execute(request);
    }

    public async getOrLoadFile(request: GetOrLoadFileRequest): Promise<Result<FileDTO>> {
        return await this.getOrLoadFileUseCase.execute(request);
    }

    public async downloadFile(request: DownloadFileRequest): Promise<Result<DownloadFileResponse>> {
        return await this.downloadFileUseCase.execute(request);
    }

    public async getFile(request: GetFileRequest): Promise<Result<FileDTO>> {
        return await this.getFileUseCase.execute(request);
    }

    public async uploadOwnFile(request: UploadOwnFileRequest): Promise<Result<FileDTO>> {
        return await this.uploadOwnFileUseCase.execute(request);
    }

    public async deleteFile(request: DeleteFileRequest): Promise<Result<void>> {
        return await this.deleteFileUseCase.execute(request);
    }

    public async createTokenForFile(request: CreateTokenForFileRequest): Promise<Result<TokenDTO>> {
        return await this.createTokenForFileUseCase.execute(request);
    }

    public async regenerateFileOwnershipToken(request: RegenerateFileOwnershipTokenRequest): Promise<Result<FileDTO>> {
        return await this.regenerateFileOwnershipTokenUseCase.execute(request);
    }
}
