import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { File, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileIdString, QRCode, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateQRCodeForFileRequest {
    fileId: FileIdString;
}

export interface CreateQRCodeForFileResponse {
    qrCodeBytes: string;
}

class Validator extends SchemaValidator<CreateQRCodeForFileRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateQRCodeForFileRequest"));
    }
}

export class CreateQRCodeForFileUseCase extends UseCase<CreateQRCodeForFileRequest, CreateQRCodeForFileResponse> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateQRCodeForFileRequest): Promise<Result<CreateQRCodeForFileResponse>> {
        const file = await this.fileController.getFile(CoreId.from(request.fileId));

        if (!file) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        const qrCode = await QRCode.forTruncateable(file);
        return Result.ok({ qrCodeBytes: qrCode.asBase64() });
    }
}
