import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId, PasswordLocationIndicator } from "@nmshd/core-types";
import { File, FileController, PasswordProtectionCreationParameters, TokenContentFile, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, FileIdString, ISO8601DateTimeString, QRCode, RuntimeErrors, SchemaRepository, TokenAndTemplateCreationValidator, UseCase } from "../../common";

export interface SchemaValidatableCreateTokenQRCodeForFileRequest {
    fileId: FileIdString;
    expiresAt?: ISO8601DateTimeString;
    forIdentity?: AddressString;
    passwordProtection?: {
        /**
         * @minLength 1
         */
        password: string;
        passwordIsPin?: true;
        passwordLocationIndicator?: unknown;
    };
}

export type CreateTokenQRCodeForFileRequest = SchemaValidatableCreateTokenQRCodeForFileRequest & {
    passwordProtection?: { passwordLocationIndicator?: PasswordLocationIndicator };
};

export interface CreateTokenQRCodeForFileResponse {
    qrCodeBytes: string;
}

class Validator extends TokenAndTemplateCreationValidator<CreateTokenQRCodeForFileRequest> {
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
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            passwordProtection: PasswordProtectionCreationParameters.create(request.passwordProtection)
        });

        const qrCode = await QRCode.forTruncateable(token);
        return Result.ok({ qrCodeBytes: qrCode.asBase64() });
    }
}
