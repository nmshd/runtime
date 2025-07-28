import { Result } from "@js-soft/ts-utils";
import { CoreId, FileReference, Reference } from "@nmshd/core-types";
import { CryptoSecretKey } from "@nmshd/crypto";
import { FileDTO } from "@nmshd/runtime-types";
import { AccountController, BackboneIds, FileController, TokenContentFile, TokenController, TokenReference } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import {
    FileReferenceString,
    RuntimeErrors,
    SchemaRepository,
    SchemaValidator,
    TokenReferenceString,
    URLFileReferenceString,
    URLTokenReferenceString,
    UseCase
} from "../../common";
import { FileMapper } from "./FileMapper";

/**
 * @errorMessage token / file reference invalid
 */
export interface GetOrLoadFileRequest {
    reference: TokenReferenceString | FileReferenceString | URLTokenReferenceString | URLFileReferenceString;
    password?: string;
}

class Validator extends SchemaValidator<GetOrLoadFileRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetOrLoadFileRequest"));
    }
}

export class GetOrLoadFileUseCase extends UseCase<GetOrLoadFileRequest, FileDTO> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetOrLoadFileRequest): Promise<Result<FileDTO>> {
        const result = await this.loadFileFromReference(request.reference, request.password);

        await this.accountController.syncDatawallet();

        return result;
    }

    private async loadFileFromReference(referenceString: string, password?: string): Promise<Result<FileDTO>> {
        const reference = Reference.from(referenceString);

        if (BackboneIds.file.validate(reference.id)) {
            return await this.loadFileFromFileReference(FileReference.from(reference));
        }

        if (BackboneIds.token.validate(reference.id)) {
            return await this.loadFileFromTokenReference(TokenReference.from(reference), password);
        }

        throw RuntimeErrors.general.invalidReference();
    }

    private async loadFileFromFileReference(reference: FileReference): Promise<Result<FileDTO>> {
        const file = await this.fileController.getOrLoadFileByReference(reference);
        return Result.ok(FileMapper.toFileDTO(file));
    }

    private async loadFileFromTokenReference(reference: TokenReference, password?: string): Promise<Result<FileDTO>> {
        const token = await this.tokenController.loadPeerTokenByReference(TokenReference.from(reference), true, password);

        if (!(token.content instanceof TokenContentFile)) {
            return Result.fail(RuntimeErrors.general.invalidTokenContent());
        }

        const content = token.content;
        return await this.loadFile(content.fileId, content.secretKey);
    }

    private async loadFile(id: CoreId, key: CryptoSecretKey): Promise<Result<FileDTO>> {
        const file = await this.fileController.getOrLoadFile(id, key);
        return Result.ok(FileMapper.toFileDTO(file));
    }
}
