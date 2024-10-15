import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { File, FileController, TokenContentFile, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, FileIdString, ISO8601DateTimeString, QRCode, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateTokenQRCodeForFileRequest {
    fileId: FileIdString;
    expiresAt?: ISO8601DateTimeString;
    forIdentity?: AddressString;
}

export interface CreateTokenQRCodeForFileResponse {
    qrCodeBytes: string;
}

class Validator extends SchemaValidator<CreateTokenQRCodeForFileRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenQRCodeForFileRequest"));
    }
}

export class CreateTokenQRCodeForFileUseCase extends UseCase<CreateTokenQRCodeForFileRequest, CreateTokenQRCodeForFileResponse> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateTokenQRCodeForFileRequest): Promise<Result<CreateTokenQRCodeForFileResponse>> {
        const file = await this.fileController.getFile(CoreId.from(request.fileId));

        if (!file) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        const tokenContent = TokenContentFile.from({
            fileId: file.id,
            secretKey: file.secretKey
        });

        const defaultTokenExpiry = file.cache?.expiresAt ?? CoreDate.utc().add({ days: 12 });
        const tokenExpiry = request.expiresAt ? CoreDate.from(request.expiresAt) : defaultTokenExpiry;
        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: tokenExpiry,
            ephemeral: true,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined
        });

        const qrCode = await QRCode.forTruncateable(token);
        return Result.ok({ qrCodeBytes: qrCode.asBase64() });
    }
}
