import { Result } from "@js-soft/ts-utils";
import { CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, CoreId, FileController, Token, TokenContentFile, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { FileDTO } from "../../../types";
import {
    Base64ForIdPrefix,
    FileIdString,
    FileReferenceString,
    JsonSchema,
    RuntimeErrors,
    SchemaRepository,
    SchemaValidator,
    TokenReferenceString,
    UseCase,
    ValidationFailure,
    ValidationResult
} from "../../common";
import { FileMapper } from "./FileMapper";

export interface GetOrLoadFileViaSecretRequest {
    id: FileIdString;
    /**
     * @minLength 10
     */
    secretKey: string;
}

/**
 * @errorMessage token / file reference invalid
 */
export interface GetOrLoadFileViaReferenceRequest {
    reference: TokenReferenceString | FileReferenceString;
}

export type GetOrLoadFileRequest = GetOrLoadFileViaSecretRequest | GetOrLoadFileViaReferenceRequest;

function isViaSecret(request: GetOrLoadFileRequest): request is GetOrLoadFileViaSecretRequest {
    return "id" in request && "secretKey" in request;
}

function isViaReference(request: GetOrLoadFileRequest): request is GetOrLoadFileViaSecretRequest {
    return "reference" in request;
}

class Validator extends SchemaValidator<GetOrLoadFileRequest> {
    private readonly loadViaSecretSchema: JsonSchema;
    private readonly loadViaReferenceSchema: JsonSchema;

    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetOrLoadFileRequest"));
        this.loadViaSecretSchema = schemaRepository.getSchema("GetOrLoadFileViaSecretRequest");
        this.loadViaReferenceSchema = schemaRepository.getSchema("GetOrLoadFileViaReferenceRequest");
    }

    public override validate(input: GetOrLoadFileRequest): ValidationResult {
        if (this.schema.validate(input).isValid) return new ValidationResult();

        // any-of in combination with missing properties is a bit weird
        // when { reference: null | undefined } is passed, it ignores reference
        // and treats it like a GetOrLoadFileViaSecret.
        // That's why we validate with the specific schema afterwards
        if (isViaReference(input)) {
            return this.convertValidationResult(this.loadViaReferenceSchema.validate(input));
        } else if (isViaSecret(input)) {
            return this.convertValidationResult(this.loadViaSecretSchema.validate(input));
        }

        const result = new ValidationResult();
        result.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPayload()));
        return result;
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
        let createdFileResult: Result<FileDTO>;

        if (isViaSecret(request)) {
            const key = CryptoSecretKey.fromBase64(request.secretKey);
            createdFileResult = await this.loadFile(CoreId.from(request.id), key);
        } else if (isViaReference(request)) {
            createdFileResult = await this.loadFileFromReference(request.reference);
        } else {
            throw new Error("Invalid request format.");
        }

        await this.accountController.syncDatawallet();

        return createdFileResult;
    }

    private async loadFileFromReference(reference: string): Promise<Result<FileDTO>> {
        if (reference.startsWith(Base64ForIdPrefix.File)) {
            return await this.loadFileFromFileReference(reference);
        }

        if (reference.startsWith(Base64ForIdPrefix.Token)) {
            return await this.loadFileFromTokenReference(reference);
        }

        throw RuntimeErrors.files.invalidReference(reference);
    }

    private async loadFileFromFileReference(truncatedReference: string): Promise<Result<FileDTO>> {
        const file = await this.fileController.getOrLoadFileByTruncated(truncatedReference);
        return Result.ok(FileMapper.toFileDTO(file));
    }

    private async loadFileFromTokenReference(truncatedReference: string): Promise<Result<FileDTO>> {
        const token = await this.tokenController.loadPeerTokenByTruncated(truncatedReference, true);

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
