import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, FileController, Token, TokenContentFile, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileDTO } from "../../../types";
import { Base64ForIdPrefix, FileReferenceString, RuntimeErrors, SchemaRepository, SchemaValidator, TokenReferenceString, UseCase } from "../../common";
import { FileMapper } from "./FileMapper";

/**
 * @errorMessage token / file reference invalid
 */
export interface GetOrLoadFileRequest {
    reference: TokenReferenceString | FileReferenceString;
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

    private async loadFileFromReference(reference: string, password?: string): Promise<Result<FileDTO>> {
        if (reference.startsWith(Base64ForIdPrefix.File)) {
            return await this.loadFileFromFileReference(reference);
        }

        if (reference.startsWith(Base64ForIdPrefix.Token)) {
            return await this.loadFileFromTokenReference(reference, password);
        }

        throw RuntimeErrors.files.invalidReference(reference);
    }

    private async loadFileFromFileReference(truncatedReference: string): Promise<Result<FileDTO>> {
        const file = await this.fileController.getOrLoadFileByTruncated(truncatedReference);
        return Result.ok(FileMapper.toFileDTO(file));
    }

    private async loadFileFromTokenReference(truncatedReference: string, password?: string): Promise<Result<FileDTO>> {
        const token = await this.tokenController.loadPeerTokenByTruncated(truncatedReference, true, password);

        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        if (!(token.cache.content instanceof TokenContentFile)) {
            return Result.fail(RuntimeErrors.general.invalidTokenContent());
        }

        const content = token.cache.content;
        return await this.loadFile(content.fileId, content.secretKey);
    }

    private async loadFile(id: CoreId, key: CryptoSecretKey): Promise<Result<FileDTO>> {
        const file = await this.fileController.getOrLoadFile(id, key);
        return Result.ok(FileMapper.toFileDTO(file));
    }
}
