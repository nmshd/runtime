import { Result } from "@js-soft/ts-utils";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, CoreDate, FileController } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { Inject } from "typescript-ioc";
import { FileDTO } from "../../../types";
import { ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { FileMapper } from "./FileMapper";

export interface UploadOwnFileRequest {
    content: Uint8Array;
    filename: string;
    mimetype: string;
    expiresAt?: ISO8601DateTimeString;
    title: string;
    description?: string;
}

export interface UploadOwnFileValidatableRequest extends Omit<UploadOwnFileRequest, "content"> {
    content: object;
}

class Validator extends SchemaValidator<UploadOwnFileValidatableRequest> {
    private _maxFileSize: number;
    public set maxFileSize(fileSize: number) {
        this._maxFileSize = fileSize;
    }

    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UploadOwnFileValidatableRequest"));
    }

    public override validate(input: UploadOwnFileRequest): ValidationResult {
        const validationResult = super.validate(input);
        if (!validationResult.isValid()) return validationResult;

        if (input.content.byteLength > this._maxFileSize) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<UploadOwnFileValidatableRequest>((r) => r.content)}' is too large`),
                    nameof<UploadOwnFileValidatableRequest>((r) => r.content)
                )
            );
        }

        if (input.content.length === 0) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<UploadOwnFileValidatableRequest>((r) => r.content)}' is empty`),
                    nameof<UploadOwnFileValidatableRequest>((r) => r.content)
                )
            );
        }

        if (input.expiresAt && CoreDate.from(input.expiresAt).isSameOrBefore(CoreDate.utc())) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<UploadOwnFileValidatableRequest>((r) => r.expiresAt)}' must be in the future`),
                    nameof<UploadOwnFileValidatableRequest>((r) => r.expiresAt)
                )
            );
        }

        return validationResult;
    }
}

export class UploadOwnFileUseCase extends UseCase<UploadOwnFileRequest, FileDTO> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
        validator.maxFileSize = fileController.config.platformMaxUnencryptedFileSize;
    }

    protected async executeInternal(request: UploadOwnFileRequest): Promise<Result<FileDTO>> {
        const maxDate = "9999-12-31T00:00:00.000Z";
        const expiresAt = request.expiresAt ?? maxDate;

        const file = await this.fileController.sendFile({
            buffer: CoreBuffer.from(request.content),
            title: request.title,
            description: request.description ?? "",
            filename: request.filename,
            mimetype: request.mimetype,
            expiresAt: CoreDate.from(expiresAt)
        });

        await this.accountController.syncDatawallet();

        return Result.ok(FileMapper.toFileDTO(file));
    }
}
