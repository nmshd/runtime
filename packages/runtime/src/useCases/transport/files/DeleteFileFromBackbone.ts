import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteFileFromBackboneRequest {
    id: FileIdString;
}

class Validator extends SchemaValidator<DeleteFileFromBackboneRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteFileFromBackboneRequest"));
    }
}

export class DeleteFileFromBackboneUseCase extends UseCase<DeleteFileFromBackboneRequest, void> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteFileFromBackboneRequest): Promise<Result<void>> {
        await this.fileController.deleteFileFromBackbone(CoreId.from(request.id));

        return Result.ok(undefined);
    }
}
