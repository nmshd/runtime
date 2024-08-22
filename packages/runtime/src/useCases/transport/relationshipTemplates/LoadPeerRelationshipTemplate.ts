import { Result } from "@js-soft/ts-utils";
import { CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, CoreId, RelationshipTemplateController, Token, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipTemplateDTO } from "../../../types";
import {
    Base64ForIdPrefix,
    JsonSchema,
    RelationshipTemplateIdString,
    RelationshipTemplateReferenceString,
    RuntimeErrors,
    SchemaRepository,
    SchemaValidator,
    TokenReferenceString,
    UseCase,
    ValidationFailure,
    ValidationResult
} from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

export interface LoadPeerRelationshipTemplateViaSecretRequest {
    id: RelationshipTemplateIdString;
    /**
     * @minLength 10
     */
    secretKey: string;
}

/**
 * @errorMessage token / relationship template reference invalid
 */
export interface LoadPeerRelationshipTemplateViaReferenceRequest {
    reference: TokenReferenceString | RelationshipTemplateReferenceString;
}

export type LoadPeerRelationshipTemplateRequest = LoadPeerRelationshipTemplateViaSecretRequest | LoadPeerRelationshipTemplateViaReferenceRequest;

function isLoadPeerRelationshipTemplateViaSecret(request: LoadPeerRelationshipTemplateRequest): request is LoadPeerRelationshipTemplateViaSecretRequest {
    return "id" in request && "secretKey" in request;
}

function isLoadPeerRelationshipTemplateViaReference(request: LoadPeerRelationshipTemplateRequest): request is LoadPeerRelationshipTemplateViaReferenceRequest {
    return "reference" in request;
}

class Validator extends SchemaValidator<LoadPeerRelationshipTemplateRequest> {
    private readonly loadViaSecretSchema: JsonSchema;
    private readonly loadViaReferenceSchema: JsonSchema;

    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerRelationshipTemplateRequest"));

        this.loadViaSecretSchema = schemaRepository.getSchema("LoadPeerRelationshipTemplateViaSecretRequest");
        this.loadViaReferenceSchema = schemaRepository.getSchema("LoadPeerRelationshipTemplateViaReferenceRequest");
    }

    public override validate(input: LoadPeerRelationshipTemplateRequest): ValidationResult {
        if (this.schema.validate(input).isValid) return new ValidationResult();

        // any-of in combination with missing properties is a bit weird
        // when { reference: null | undefined } is passed, it ignores reference
        // and treats it like a LoadPeerFileViaSecret.
        // That's why we validate with the specific schema afterwards
        if (isLoadPeerRelationshipTemplateViaReference(input)) {
            return this.convertValidationResult(this.loadViaReferenceSchema.validate(input));
        } else if (isLoadPeerRelationshipTemplateViaSecret(input)) {
            return this.convertValidationResult(this.loadViaSecretSchema.validate(input));
        }

        const result = new ValidationResult();
        result.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPayload()));
        return result;
    }
}

export class LoadPeerRelationshipTemplateUseCase extends UseCase<LoadPeerRelationshipTemplateRequest, RelationshipTemplateDTO> {
    public constructor(
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        let createdTemplateResult: Result<RelationshipTemplateDTO>;

        if (isLoadPeerRelationshipTemplateViaSecret(request)) {
            const key = CryptoSecretKey.fromBase64(request.secretKey);
            createdTemplateResult = await this.loadTemplate(CoreId.from(request.id), key);
        } else if (isLoadPeerRelationshipTemplateViaReference(request)) {
            createdTemplateResult = await this.loadRelationshipTemplateFromReference(request.reference);
        } else {
            throw new Error("Invalid request format.");
        }

        await this.accountController.syncDatawallet();

        return createdTemplateResult;
    }

    private async loadRelationshipTemplateFromReference(reference: string): Promise<Result<RelationshipTemplateDTO>> {
        if (reference.startsWith(Base64ForIdPrefix.RelationshipTemplate)) {
            return await this.loadRelationshipTemplateFromRelationshipTemplateReference(reference);
        }

        if (reference.startsWith(Base64ForIdPrefix.Token)) {
            return await this.loadRelationshipTemplateFromTokenReference(reference);
        }

        throw RuntimeErrors.relationshipTemplates.invalidReference(reference);
    }

    private async loadRelationshipTemplateFromRelationshipTemplateReference(relationshipTemplateReference: string) {
        const template = await this.templateController.loadPeerRelationshipTemplateByTruncated(relationshipTemplateReference);
        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(template));
    }

    private async loadRelationshipTemplateFromTokenReference(tokenReference: string): Promise<Result<RelationshipTemplateDTO>> {
        const token = await this.tokenController.loadPeerTokenByTruncated(tokenReference, true);

        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        if (!(token.cache.content instanceof TokenContentRelationshipTemplate)) {
            return Result.fail(RuntimeErrors.general.invalidTokenContent());
        }

        const content = token.cache.content;
        return await this.loadTemplate(content.templateId, content.secretKey);
    }

    private async loadTemplate(id: CoreId, key: CryptoSecretKey) {
        const template = await this.templateController.loadPeerRelationshipTemplate(id, key);
        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(template));
    }
}
