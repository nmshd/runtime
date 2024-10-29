import { Result } from "@js-soft/ts-utils";
import { AccountController, RelationshipTemplateController, RelationshipTemplateReference, Token, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { RelationshipTemplateDTO } from "../../../types";
import {
    Base64ForIdPrefix,
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

/**
 * @errorMessage token / relationship template reference invalid
 */
export interface LoadPeerRelationshipTemplateRequest {
    reference: TokenReferenceString | RelationshipTemplateReferenceString;
    password?: string;
    pin?: string;
}

class Validator extends SchemaValidator<LoadPeerRelationshipTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerRelationshipTemplateRequest"));
    }

    public override validate(input: LoadPeerRelationshipTemplateRequest): ValidationResult {
        const validationResult = super.validate(input);
        if (!validationResult.isValid()) return validationResult;

        if (input.pin && !/^[0-9]{4,16}$/.test(input.pin)) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<LoadPeerRelationshipTemplateRequest>((r) => r.pin)}' must consist of 4 to 16 numbers`),
                    nameof<LoadPeerRelationshipTemplateRequest>((r) => r.pin)
                )
            );
        }

        if (!!input.password && !!input.pin) {
            validationResult.addFailure(new ValidationFailure(RuntimeErrors.general.notBothPasswordAndPin()));
        }

        return validationResult;
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
        const result = await this.loadRelationshipTemplateFromReference(request.reference, request.password, request.pin);

        await this.accountController.syncDatawallet();

        return result;
    }

    private async loadRelationshipTemplateFromReference(reference: string, password?: string, pin?: string): Promise<Result<RelationshipTemplateDTO>> {
        if (reference.startsWith(Base64ForIdPrefix.RelationshipTemplate)) {
            return await this.loadRelationshipTemplateFromRelationshipTemplateReference(reference, password, pin);
        }

        if (reference.startsWith(Base64ForIdPrefix.Token)) {
            return await this.loadRelationshipTemplateFromTokenReference(reference, password, pin);
        }

        throw RuntimeErrors.relationshipTemplates.invalidReference(reference);
    }

    private async loadRelationshipTemplateFromRelationshipTemplateReference(
        relationshipTemplateReference: string,
        password?: string,
        pin?: string
    ): Promise<Result<RelationshipTemplateDTO>> {
        const reference = RelationshipTemplateReference.from(relationshipTemplateReference);
        if (reference.passwordType?.startsWith("pw") && !password) return Result.fail(RuntimeErrors.general.noPasswordProvided());
        if (reference.passwordType?.startsWith("pin") && !pin) return Result.fail(RuntimeErrors.general.noPINProvided());

        const template = await this.templateController.loadPeerRelationshipTemplateByTruncated(relationshipTemplateReference, password, pin);
        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(template));
    }

    private async loadRelationshipTemplateFromTokenReference(tokenReference: string, password?: string, pin?: string): Promise<Result<RelationshipTemplateDTO>> {
        const token = await this.tokenController.loadPeerTokenByTruncated(tokenReference, true);

        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        if (!(token.cache.content instanceof TokenContentRelationshipTemplate)) {
            return Result.fail(RuntimeErrors.general.invalidTokenContent());
        }

        const content = token.cache.content;
        if (content.passwordType?.startsWith("pw") && !password) return Result.fail(RuntimeErrors.general.noPasswordProvided());
        if (content.passwordType?.startsWith("pin") && !pin) return Result.fail(RuntimeErrors.general.noPINProvided());

        const template = await this.templateController.loadPeerRelationshipTemplate(
            content.templateId,
            content.secretKey,
            content.forIdentity?.toString(),
            password,
            pin,
            content.salt
        );
        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(template));
    }
}
