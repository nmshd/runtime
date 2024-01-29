import { Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { FileDTO, TokenDTO } from "../../../types";
import {
    CreateQRCodeForFileRequest,
    CreateQRCodeForFileResponse,
    CreateQRCodeForFileUseCase,
    CreateTokenForFileRequest,
    CreateTokenForFileUseCase,
    CreateTokenQRCodeForFileRequest,
    CreateTokenQRCodeForFileResponse,
    CreateTokenQRCodeForFileUseCase,
    DownloadFileRequest,
    DownloadFileResponse,
    DownloadFileUseCase,
    GetFileRequest,
    GetFilesRequest,
    GetFilesUseCase,
    GetFileUseCase,
    GetOrLoadFileRequest,
    GetOrLoadFileUseCase,
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
        @Inject private readonly createQRCodeForFileUseCase: CreateQRCodeForFileUseCase,
        @Inject private readonly createTokenForFileUseCase: CreateTokenForFileUseCase,
        @Inject private readonly createTokenQRCodeForFileUseCase: CreateTokenQRCodeForFileUseCase
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

    public async createQRCodeForFile(request: CreateQRCodeForFileRequest): Promise<Result<CreateQRCodeForFileResponse>> {
        return await this.createQRCodeForFileUseCase.execute(request);
    }

    public async createTokenForFile(request: CreateTokenForFileRequest): Promise<Result<TokenDTO>> {
        return await this.createTokenForFileUseCase.execute(request);
    }

    public async createTokenQRCodeForFile(request: CreateTokenQRCodeForFileRequest): Promise<Result<CreateTokenQRCodeForFileResponse>> {
        return await this.createTokenQRCodeForFileUseCase.execute(request);
    }
}
