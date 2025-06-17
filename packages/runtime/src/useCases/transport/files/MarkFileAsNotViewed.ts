import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { AccountController, FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileDTO } from "../../../types";
import { FileIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { FileMapper } from "./FileMapper";

export interface MarkFileAsNotViewedRequest {
    id: FileIdString;
}

class Validator extends SchemaValidator<MarkFileAsNotViewedRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("MarkFileAsNotViewedRequest"));
    }
}

export class MarkFileAsNotViewedUseCase extends UseCase<MarkFileAsNotViewedRequest, FileDTO> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: MarkFileAsNotViewedRequest): Promise<Result<FileDTO>> {
        const updatedFile = await this.fileController.markFileAsNotViewed(CoreId.from(request.id));

        await this.accountController.syncDatawallet();

        return Result.ok(FileMapper.toFileDTO(updatedFile));
    }
}
