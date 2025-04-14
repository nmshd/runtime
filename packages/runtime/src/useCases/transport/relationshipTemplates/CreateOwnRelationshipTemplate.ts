import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreAddress, CoreDate, PasswordLocationIndicator } from "@nmshd/core-types";
import { AccountController, PasswordProtectionCreationParameters, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateDTO } from "../../../types";
import { AddressString, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, TokenAndTemplateCreationValidator, UseCase } from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

export interface CreateOwnRelationshipTemplateRequest {
    expiresAt: ISO8601DateTimeString;
    content: any;
    /**
     * @minimum 1
     */
    maxNumberOfAllocations?: number;
    forIdentity?: AddressString;
    passwordProtection?: {
        /**
         * @minLength 1
         */
        password: string;
        passwordIsPin?: true;
        passwordLocationIndicator?: unknown;
    };
}

class Validator extends TokenAndTemplateCreationValidator<CreateOwnRelationshipTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateOwnRelationshipTemplateRequest"));
    }
}

export class CreateOwnRelationshipTemplateUseCase extends UseCase<CreateOwnRelationshipTemplateRequest, RelationshipTemplateDTO> {
    public constructor(
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly outgoingRequestsController: OutgoingRequestsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateOwnRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        const content = request.content;

        const validationError = await this.validateRelationshipTemplateContent(content, CoreDate.from(request.expiresAt));
        if (validationError) return Result.fail(validationError);

        if (Serializable.fromUnknown(content) instanceof RelationshipTemplateContent && !content.onNewRelationship.expiresAt) {
            content.onNewRelationship.expiresAt = CoreDate.from(request.expiresAt);
        }

        const passwordProtection = request.passwordProtection
            ? PasswordProtectionCreationParameters.create({
                  password: request.passwordProtection.password,
                  passwordIsPin: request.passwordProtection.passwordIsPin,
                  passwordLocationIndicator: request.passwordProtection.passwordLocationIndicator as PasswordLocationIndicator
              })
            : undefined;

        const relationshipTemplate = await this.templateController.sendRelationshipTemplate({
            content: content,
            expiresAt: CoreDate.from(request.expiresAt),
            maxNumberOfAllocations: request.maxNumberOfAllocations,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            passwordProtection
        });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(relationshipTemplate));
    }

    private async validateRelationshipTemplateContent(content: any, templateExpiresAt: CoreDate) {
        const transformedContent = Serializable.fromUnknown(content);

        if (!(transformedContent instanceof RelationshipTemplateContent || transformedContent instanceof ArbitraryRelationshipTemplateContent)) {
            return RuntimeErrors.general.invalidPropertyValue(
                "The content of a RelationshipTemplate must either be a RelationshipTemplateContent or an ArbitraryRelationshipTemplateContent."
            );
        }

        if (!(transformedContent instanceof RelationshipTemplateContent)) return;

        if (transformedContent.onNewRelationship.expiresAt?.isAfter(templateExpiresAt)) {
            return RuntimeErrors.relationshipTemplates.requestCannotExpireAfterRelationshipTemplate();
        }

        const validationResult = await this.outgoingRequestsController.canCreate({ content: transformedContent.onNewRelationship });
        if (validationResult.isError()) return validationResult.error;

        if (transformedContent.onExistingRelationship) {
            const validationResult = await this.outgoingRequestsController.canCreate({ content: transformedContent.onExistingRelationship });
            if (validationResult.isError()) return validationResult.error;
        }

        return;
    }
}
