import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { File, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { FileMapper } from "./FileMapper";

export interface DownloadFileRequest {
    id: FileIdString;
}

class Validator extends SchemaValidator<DownloadFileRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DownloadFileRequest"));
    }
}

export interface DownloadFileResponse {
    content: Uint8Array;
    filename: string;
    mimetype: string;
}

export class DownloadFileUseCase extends UseCase<DownloadFileRequest, DownloadFileResponse> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly fileMapper: FileMapper,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DownloadFileRequest): Promise<Result<DownloadFileResponse>> {
        const fileId = CoreId.from(request.id);
        const fileMetadata = await this.fileController.getFile(fileId);

        if (!fileMetadata) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        const fileContent = await this.fileController.downloadFileContent(fileMetadata);

        const result = Result.ok(this.fileMapper.toDownloadFileResponse(fileContent, fileMetadata));
        return result;
    }
}
