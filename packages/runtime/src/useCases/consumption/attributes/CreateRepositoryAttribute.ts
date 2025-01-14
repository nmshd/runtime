import { ApplicationError, Result } from "@js-soft/ts-utils";
import { AttributesController, CreateRepositoryAttributeParams } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import _ from "lodash";
import { LocalAttributeDTO } from "../../../types";
import { flattenObject, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";
import { AttributeMapper } from "./AttributeMapper";

export interface CreateRepositoryAttributeRequest {
    content: {
        value: AttributeValues.Identity.Json;
        tags?: string[];
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
}

class Validator implements IValidator<CreateRepositoryAttributeRequest> {
    public constructor(@Inject private readonly schemaRepository: SchemaRepository) {}

    public validate(value: CreateRepositoryAttributeRequest): Promise<ValidationResult> | ValidationResult {
        const requestSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema("CreateRepositoryAttributeRequest"));
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

export class CreateRepositoryAttributeUseCase extends UseCase<CreateRepositoryAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateRepositoryAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const params = CreateRepositoryAttributeParams.from({
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                ...request.content
            }
        });

        const queryForRepositoryAttributeDuplicates = flattenObject({
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                value: request.content.value
            }
        });

        queryForRepositoryAttributeDuplicates["succeededBy"] = { $exists: false };

        const existingRepositoryAttributes = await this.attributeController.getLocalAttributes(queryForRepositoryAttributeDuplicates);

        const exactMatchExists = existingRepositoryAttributes.some((duplicate) => _.isEqual(duplicate.content.value.toJSON(), request.content.value));

        if (exactMatchExists) {
            return Result.fail(RuntimeErrors.attributes.cannotCreateDuplicateRepositoryAttribute(existingRepositoryAttributes[0].id));
        }

        const createdLocalAttribute = await this.attributeController.createRepositoryAttribute(params);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdLocalAttribute));
    }
}
