import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";
import { IdentityAttributeValueValidator } from "./IdentityAttributeValueValidator";

interface AbstractCanCreateRepositoryAttributeRequest<T> {
    content: {
        value: T;
        tags?: string[];
    };
}

export interface CanCreateRepositoryAttributeRequest extends AbstractCanCreateRepositoryAttributeRequest<AttributeValues.Identity.Json> {}

export interface SchemaValidatableCanCreateRepositoryAttributeRequest extends AbstractCanCreateRepositoryAttributeRequest<unknown> {}

class Validator implements IValidator<CanCreateRepositoryAttributeRequest> {
    public constructor(@Inject private readonly schemaRepository: SchemaRepository) {}

    public validate(request: CanCreateRepositoryAttributeRequest): ValidationResult {
        const requestSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema("CanCreateRepositoryAttributeRequest"));
        return requestSchemaValidator.validate(request);
    }
}

export type CanCreateRepositoryAttributeResponse =
    | { isSuccess: true }
    | {
          isSuccess: false;
          code: string;
          message: string;
      };

export class CanCreateRepositoryAttributeUseCase extends UseCase<CanCreateRepositoryAttributeRequest, CanCreateRepositoryAttributeResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly schemaRepository: SchemaRepository,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CanCreateRepositoryAttributeRequest): Promise<Result<CanCreateRepositoryAttributeResponse>> {
        const identityAttributeValueValidator = new IdentityAttributeValueValidator(this.schemaRepository);
        const attributeValueValidationResult = await identityAttributeValueValidator.validate(request.content.value);
        if (attributeValueValidationResult.isInvalid()) {
            const failures = attributeValueValidationResult.getFailures();
            return Result.ok({ isSuccess: false, code: failures[0].error.code, message: failures[0].error.message });
        }

        const repositoryAttributeDuplicate = await this.attributesController.getRepositoryAttributeWithSameValue(request.content.value);
        if (repositoryAttributeDuplicate) {
            const error = RuntimeErrors.attributes.cannotCreateDuplicateRepositoryAttribute(repositoryAttributeDuplicate.id);
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        if (request.content.tags && request.content.tags.length > 0) {
            const tagValidationResult = await this.attributesController.validateTagsForType(request.content.tags, request.content.value["@type"]);
            if (tagValidationResult.isError()) return Result.ok({ isSuccess: false, code: tagValidationResult.error.code, message: tagValidationResult.error.message });
        }

        return Result.ok({ isSuccess: true });
    }
}
