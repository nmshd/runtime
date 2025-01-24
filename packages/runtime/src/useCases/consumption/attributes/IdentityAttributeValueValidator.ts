import { ApplicationError } from "@js-soft/ts-utils";
import { AttributeValues } from "@nmshd/content";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, ValidationFailure, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";

export class IdentityAttributeValueValidator implements IValidator<AttributeValues.Identity.Json> {
    public constructor(@Inject private readonly schemaRepository: SchemaRepository) {}

    public validate(identityAttributeValue: AttributeValues.Identity.Json): Promise<ValidationResult> | ValidationResult {
        const attributeValueType = identityAttributeValue["@type"];
        if (!AttributeValues.Identity.TYPE_NAMES.includes(attributeValueType)) {
            const attributeValueTypeValidationResult = new ValidationResult();

            attributeValueTypeValidationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue("content.value.@type must match one of the allowed Attribute value types for IdentityAttributes"),
                    "@type"
                )
            );
            return attributeValueTypeValidationResult;
        }

        const attributeValueSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema(attributeValueType));
        const attributeValueValidationResult = attributeValueSchemaValidator.validate(identityAttributeValue);
        return IdentityAttributeValueValidator.addPrefixToErrorMessagesOfResult(`${attributeValueType} :: `, attributeValueValidationResult);
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
