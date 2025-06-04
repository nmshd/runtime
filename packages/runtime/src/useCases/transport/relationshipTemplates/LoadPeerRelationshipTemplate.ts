import { Result } from "@js-soft/ts-utils";
import { Reference } from "@nmshd/core-types";
import {
    AccountController,
    RelationshipTemplateController,
    RelationshipTemplateReference,
    Token,
    TokenContentRelationshipTemplate,
    TokenController,
    TokenReference
} from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateDTO } from "../../../types";
import {
    RelationshipTemplateReferenceString,
    RuntimeErrors,
    SchemaRepository,
    SchemaValidator,
    TokenReferenceString,
    URLRelationshipTemplateReferenceString,
    URLTokenReferenceString,
    UseCase
} from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

/**
 * @errorMessage token / relationship template reference invalid
 */
export interface LoadPeerRelationshipTemplateRequest {
    reference: TokenReferenceString | RelationshipTemplateReferenceString | URLTokenReferenceString | URLRelationshipTemplateReferenceString;
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
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        const result = await this.loadRelationshipTemplateFromReference(request.reference, request.password);

        await this.accountController.syncDatawallet();

        return result;
    }

    private async loadRelationshipTemplateFromReference(referenceString: string, password?: string): Promise<Result<RelationshipTemplateDTO>> {
        const reference = Reference.from(referenceString);

        if (reference.id.toString().startsWith("RLT")) {
            return await this.loadRelationshipTemplateFromRelationshipTemplateReference(RelationshipTemplateReference.from(reference), password);
        }

        if (reference.id.toString().startsWith("TOK")) {
            return await this.loadRelationshipTemplateFromTokenReference(TokenReference.from(reference), password);
        }

        throw RuntimeErrors.general.invalidReference();
    }

    private async loadRelationshipTemplateFromRelationshipTemplateReference(reference: RelationshipTemplateReference, password?: string): Promise<Result<RelationshipTemplateDTO>> {
        const template = await this.templateController.loadPeerRelationshipTemplateByReference(reference, password);
        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(template));
    }

    private async loadRelationshipTemplateFromTokenReference(reference: TokenReference, password?: string): Promise<Result<RelationshipTemplateDTO>> {
        const token = await this.tokenController.loadPeerTokenByReference(reference, true, password);

        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        if (!(token.cache.content instanceof TokenContentRelationshipTemplate)) {
            return Result.fail(RuntimeErrors.general.invalidTokenContent());
        }

        const content = token.cache.content;
        const template = await this.templateController.loadPeerRelationshipTemplateByTokenContent(content, password);
        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(template));
    }
}
