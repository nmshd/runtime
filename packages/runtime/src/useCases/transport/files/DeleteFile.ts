import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { AccountController, File, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteFileRequest {
    fileId: FileIdString;
}

class Validator extends SchemaValidator<DeleteFileRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteFileRequest"));
    }
}

export class DeleteFileUseCase extends UseCase<DeleteFileRequest, void> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteFileRequest): Promise<Result<void>> {
        const file = await this.fileController.getFile(CoreId.from(request.fileId));
        if (!file) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        await this.fileController.deleteFile(file);
        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
