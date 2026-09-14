import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { FileDTO } from "@nmshd/runtime-types";
import { AccountController, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { parse as parseMediaType } from "media-typer";
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

        const filenameValidationError = this.validateFilename(input.filename);
        if (filenameValidationError) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(filenameValidationError),
                    nameof<UploadOwnFileValidatableRequest>((r) => r.filename)
                )
            );
        }

        const mimetypeValidationError = this.validateMimetype(input.mimetype);
        if (mimetypeValidationError) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(mimetypeValidationError),
                    nameof<UploadOwnFileValidatableRequest>((r) => r.mimetype)
                )
            );
        }

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

    private validateFilename(filename: string): string | undefined {
        const propertyName = nameof<UploadOwnFileValidatableRequest>((r) => r.filename);

        if (filename.trim().length === 0) return `'${propertyName}' must not be empty or consist only of whitespace`;
        if (filename === "." || filename === "..") return `'${propertyName}' must not be '.' or '..'`;
        if (/[\\/]/.test(filename)) return `'${propertyName}' must not contain path separators`;
        if (/\p{Cc}/u.test(filename)) return `'${propertyName}' must not contain Unicode control characters`;
        if (new TextEncoder().encode(filename).byteLength > 255) return `'${propertyName}' must not exceed 255 UTF-8 bytes`;

        return undefined;
    }

    private validateMimetype(mimetype: string): string | undefined {
        const propertyName = nameof<UploadOwnFileValidatableRequest>((r) => r.mimetype);

        if (mimetype.trim().length === 0) return `'${propertyName}' must not be empty or consist only of whitespace`;
        if (mimetype.trim() !== mimetype) return `'${propertyName}' must not contain leading or trailing whitespace`;

        try {
            parseMediaType(mimetype);
            return undefined;
        } catch {
            return `'${propertyName}' must be a concrete media type in the form 'type/subtype' without parameters or wildcards`;
        }
    }
}

export class UploadOwnFileUseCase extends UseCase<UploadOwnFileRequest, FileDTO> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
        validator.maxFileSize = fileController.config.platformMaxUnencryptedFileSize;
    }

    protected async executeInternal(request: UploadOwnFileRequest): Promise<Result<FileDTO>> {
        if (request.tags && request.tags.length > 0) {
            const tagValidationResult = await this.attributesController.validateTagsForType(request.tags, "IdentityFileReference");
            if (tagValidationResult.isError()) return Result.fail(tagValidationResult.error);
        }

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
