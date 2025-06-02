import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { File, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface ValidateFileOwnershipTokenRequest {
    id: FileIdString;
    /**
     * @minLength 20
     * @maxLength 20
     */
    ownershipToken: string;
}

export interface ValidateFileOwnershipTokenResponse {
    isValid: boolean;
}

class Validator extends SchemaValidator<ValidateFileOwnershipTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ValidateFileOwnershipTokenRequest"));
    }
}

// TODO: maybe don't expose this as use case in general
export class ValidateFileOwnershipTokenUseCase extends UseCase<ValidateFileOwnershipTokenRequest, ValidateFileOwnershipTokenResponse> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ValidateFileOwnershipTokenRequest): Promise<Result<ValidateFileOwnershipTokenResponse>> {
        const file = await this.fileController.getFile(CoreId.from(request.id));
        if (!file) return Result.fail(RuntimeErrors.general.recordNotFound(File));

        if (!file.isOwn) return Result.fail(RuntimeErrors.files.notOwnedByYou());

        const validationResponse = await this.fileController.validateFileOwnershipToken(file.id, request.ownershipToken);
        return Result.ok(validationResponse);
    }
}
