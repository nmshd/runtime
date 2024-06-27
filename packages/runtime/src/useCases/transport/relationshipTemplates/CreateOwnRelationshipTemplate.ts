import { Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { ArbitraryRelationshipTemplateContentJSON, RelationshipTemplateContentContainingRequestJSON } from "@nmshd/content";
import { AccountController, CoreDate, RelationshipTemplateController } from "@nmshd/transport";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import { Inject } from "typescript-ioc";
import { RelationshipTemplateDTO } from "../../../types";
import { ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

export interface CreateOwnRelationshipTemplateRequest {
    expiresAt: ISO8601DateTimeString;
    content: RelationshipTemplateContentContainingRequestJSON | ArbitraryRelationshipTemplateContentJSON;
    /**
     * @minimum 1
     */
    maxNumberOfAllocations?: number;
}

class Validator extends SchemaValidator<CreateOwnRelationshipTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateOwnRelationshipTemplateRequest"));
    }

    public override validate(input: CreateOwnRelationshipTemplateRequest): ValidationResult {
        const validationResult = super.validate(input);
        if (!validationResult.isValid()) return validationResult;

        if (DateTime.fromISO(input.expiresAt) <= DateTime.utc()) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<CreateOwnRelationshipTemplateRequest>((r) => r.expiresAt)}' must be in the future`),
                    nameof<CreateOwnRelationshipTemplateRequest>((r) => r.expiresAt)
                )
            );
        }

        return validationResult;
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
        const validationError = await this.validateRelationshipTemplateContent(request.content);
        if (validationError) return Result.fail(validationError);

        const relationshipTemplate = await this.templateController.sendRelationshipTemplate({
            content: request.content,
            expiresAt: CoreDate.from(request.expiresAt),
            maxNumberOfAllocations: request.maxNumberOfAllocations
        });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(relationshipTemplate));
    }

    private async validateRelationshipTemplateContent(content: any) {
        const validationResult = await this.outgoingRequestsController.canCreate({ content: content.onNewRelationship });
        if (validationResult.isError()) return validationResult.error;

        if (content.onExistingRelationship) {
            const validationResult = await this.outgoingRequestsController.canCreate({ content: content.onExistingRelationship });
            if (validationResult.isError()) return validationResult.error;
        }

        return;
    }
}
