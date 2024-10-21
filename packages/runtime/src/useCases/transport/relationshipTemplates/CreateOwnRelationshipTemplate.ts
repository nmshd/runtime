import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { AccountController, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import { RelationshipTemplateDTO } from "../../../types";
import { AddressString, ISO8601DateTimeString, PINString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

export interface CreateOwnRelationshipTemplateRequest {
    expiresAt: ISO8601DateTimeString;
    content: any;
    /**
     * @minimum 1
     */
    maxNumberOfAllocations?: number;
    forIdentity?: AddressString;
    password?: string;
    pin?: PINString;
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

        if (input.password === "") {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<CreateOwnRelationshipTemplateRequest>((r) => r.password)}' must not be the empty string`),
                    nameof<CreateOwnRelationshipTemplateRequest>((r) => r.password)
                )
            );
        }

        if (!!input.password && !!input.pin) {
            validationResult.addFailure(new ValidationFailure(RuntimeErrors.general.notBothPasswordAndPin()));
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
            maxNumberOfAllocations: request.maxNumberOfAllocations,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            password: request.password,
            pin: request.pin
        });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(relationshipTemplate));
    }

    private async validateRelationshipTemplateContent(content: any) {
        const transformedContent = Serializable.fromUnknown(content);

        if (!(transformedContent instanceof RelationshipTemplateContent || transformedContent instanceof ArbitraryRelationshipTemplateContent)) {
            return RuntimeErrors.general.invalidPropertyValue(
                "The content of a RelationshipTemplate must either be a RelationshipTemplateContent or an ArbitraryRelationshipTemplateContent."
            );
        }

        if (!(transformedContent instanceof RelationshipTemplateContent)) return;

        const validationResult = await this.outgoingRequestsController.canCreate({ content: transformedContent.onNewRelationship });
        if (validationResult.isError()) return validationResult.error;

        if (transformedContent.onExistingRelationship) {
            const validationResult = await this.outgoingRequestsController.canCreate({ content: transformedContent.onExistingRelationship });
            if (validationResult.isError()) return validationResult.error;
        }

        return;
    }
}
