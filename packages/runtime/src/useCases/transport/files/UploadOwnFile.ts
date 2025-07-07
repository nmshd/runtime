import { Result } from "@js-soft/ts-utils";
import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { FileDTO } from "@nmshd/runtime-types";
import { AccountController, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { FileMapper } from "./FileMapper";

export interface UploadOwnFileRequest {
    content: Uint8Array;
    filename: string;
    mimetype: string;
    expiresAt?: ISO8601DateTimeString;
    title?: string;
    description?: string;
    /**
     * @uniqueItems true
     */
    tags?: string[];
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
        const file = await this.fileController.sendFile({
            buffer: CoreBuffer.from(request.content),
            title: request.title,
            description: request.description,
            filename: request.filename,
            mimetype: request.mimetype,
            expiresAt: CoreDate.from(request.expiresAt ?? "9999-12-31T00:00:00.000Z"),
            tags: request.tags
        });

        await this.accountController.syncDatawallet();

        return Result.ok(FileMapper.toFileDTO(file));
    }
}
