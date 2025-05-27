import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { AccountController, File, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileDTO } from "../../../types";
import { FileIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { FileMapper } from "./FileMapper";

export interface RegenerateFileOwnershipTokenRequest {
    id: FileIdString;
}

class Validator extends SchemaValidator<RegenerateFileOwnershipTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RegenerateFileOwnershipTokenRequest"));
    }
}

export class RegenerateFileOwnershipTokenUseCase extends UseCase<RegenerateFileOwnershipTokenRequest, FileDTO> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: RegenerateFileOwnershipTokenRequest): Promise<Result<FileDTO>> {
        const file = await this.fileController.getFile(CoreId.from(request.id));
        if (!file) return Result.fail(RuntimeErrors.general.recordNotFound(File));

        const updatedFile = await this.fileController.regenerateFileOwnershipToken(file.id);

        await this.accountController.syncDatawallet();

        return Result.ok(FileMapper.toFileDTO(updatedFile));
    }
}
