import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { File, FileController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { FileDTO } from "../../../types";
import { FileIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { FileMapper } from "./FileMapper";

export interface GetFileRequest {
    id: FileIdString;
}

class Validator extends SchemaValidator<GetFileRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetFileRequest"));
    }
}

export class GetFileUseCase extends UseCase<GetFileRequest, FileDTO> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetFileRequest): Promise<Result<FileDTO>> {
        const file = await this.fileController.getFile(CoreId.from(request.id));
        if (!file) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        return Result.ok(FileMapper.toFileDTO(file));
    }
}
