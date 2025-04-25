import { Result } from "@js-soft/ts-utils";
import { AccountController, RelationshipTemplateController, Token, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateDTO } from "../../../types";
import { Base64ForIdPrefix, RelationshipTemplateReferenceString, RuntimeErrors, SchemaRepository, SchemaValidator, TokenReferenceString, UseCase } from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

/**
 * @errorMessage token / relationship template reference invalid
 */
export interface LoadPeerRelationshipTemplateRequest {
    reference: TokenReferenceString | RelationshipTemplateReferenceString;
    password?: string;
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
        @Inject private readonly templateMapper: RelationshipTemplateMapper,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        const result = await this.loadRelationshipTemplateFromReference(request.reference, request.password);

        await this.accountController.syncDatawallet();

        return result;
    }

    private async loadRelationshipTemplateFromReference(reference: string, password?: string): Promise<Result<RelationshipTemplateDTO>> {
        if (reference.startsWith(Base64ForIdPrefix.RelationshipTemplate)) {
            return await this.loadRelationshipTemplateFromRelationshipTemplateReference(reference, password);
        }

        if (reference.startsWith(Base64ForIdPrefix.Token)) {
            return await this.loadRelationshipTemplateFromTokenReference(reference, password);
        }

        throw RuntimeErrors.relationshipTemplates.invalidReference(reference);
    }

    private async loadRelationshipTemplateFromRelationshipTemplateReference(relationshipTemplateReference: string, password?: string): Promise<Result<RelationshipTemplateDTO>> {
        const template = await this.templateController.loadPeerRelationshipTemplateByTruncated(relationshipTemplateReference, password);
        return Result.ok(this.templateMapper.toRelationshipTemplateDTO(template));
    }

    private async loadRelationshipTemplateFromTokenReference(tokenReference: string, password?: string): Promise<Result<RelationshipTemplateDTO>> {
        const token = await this.tokenController.loadPeerTokenByTruncated(tokenReference, true, password);

        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        if (!(token.cache.content instanceof TokenContentRelationshipTemplate)) {
            return Result.fail(RuntimeErrors.general.invalidTokenContent());
        }

        const content = token.cache.content;
        const template = await this.templateController.loadPeerRelationshipTemplateByTokenContent(content, password);
        return Result.ok(this.templateMapper.toRelationshipTemplateDTO(template));
    }
}
