import { ApplicationError, Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { Inject } from "@nmshd/typescript-ioc";
import { ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";

interface AbstractCanCreateRepositoryAttributeRequest<T> {
    content: {
        value: T;
        tags?: string[];
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
}

export interface CanCreateRepositoryAttributeRequest extends AbstractCanCreateRepositoryAttributeRequest<AttributeValues.Identity.Json> {}

export interface SchemaValidatableCanCreateRepositoryAttributeRequest extends AbstractCanCreateRepositoryAttributeRequest<unknown> {}

class Validator implements IValidator<CanCreateRepositoryAttributeRequest> {
    public constructor(@Inject private readonly schemaRepository: SchemaRepository) {}

    public validate(value: CanCreateRepositoryAttributeRequest): Promise<ValidationResult> | ValidationResult {
        const requestSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema("CanCreateRepositoryAttributeRequest"));
        const requestValidationResult = requestSchemaValidator.validate(value);
        if (requestValidationResult.isInvalid()) return requestValidationResult;

        const attributeType = value.content.value["@type"];
        if (!AttributeValues.Identity.TYPE_NAMES.includes(attributeType)) {
            const attributeTypeValidationResult = new ValidationResult();

            attributeTypeValidationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue("content.value.@type must match one of the allowed Attribute value types for IdentityAttributes"),
                    "@type"
                )
            );
            return attributeTypeValidationResult;
        }

        const attributeContentSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema(attributeType));
        const attributeContentValidationResult = attributeContentSchemaValidator.validate(value.content.value);
        return Validator.addPrefixToErrorMessagesOfResult(`${attributeType} :: `, attributeContentValidationResult);
    }

    private static addPrefixToErrorMessagesOfResult(prefix: string, validationResult: ValidationResult): ValidationResult {
        if (validationResult.isValid()) return validationResult;

        const failures = validationResult.getFailures();
        const failuresWithPrefix = failures.map(
            (failure) => new ValidationFailure(new ApplicationError(failure.error.code, `${prefix}${failure.error.message}`, failure.error.data), failure.propertyName)
        );

        const validationResultWithPrefix = new ValidationResult();
        validationResultWithPrefix.addFailures(failuresWithPrefix);
        return validationResultWithPrefix;
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
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CanCreateRepositoryAttributeRequest): Promise<Result<CanCreateRepositoryAttributeResponse>> {
        const repositoryAttributeDuplicate = await this.attributesController.getRepositoryAttributeWithSameValue(request.content.value);
        if (repositoryAttributeDuplicate) {
            const error = RuntimeErrors.attributes.cannotCreateDuplicateRepositoryAttribute(repositoryAttributeDuplicate.id);
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        return Result.ok({ isSuccess: true });
    }
}
