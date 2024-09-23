import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, RelationshipTemplateController, Token, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipTemplateDTO } from "../../../types";
import { Base64ForIdPrefix, RelationshipTemplateReferenceString, RuntimeErrors, SchemaRepository, SchemaValidator, TokenReferenceString, UseCase } from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

/**
 * @errorMessage token / relationship template reference invalid
 */
export interface LoadPeerRelationshipTemplateRequest {
    reference: TokenReferenceString | RelationshipTemplateReferenceString;
}

class Validator extends SchemaValidator<LoadPeerRelationshipTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerRelationshipTemplateRequest"));
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
        const result = await this.loadRelationshipTemplateFromReference(request.reference);

        await this.accountController.syncDatawallet();

        return result;
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
