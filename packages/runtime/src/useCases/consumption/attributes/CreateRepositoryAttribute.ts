import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateRepositoryAttributeParams } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
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

        const valueType = value.content.value["@type"];
        if (!AttributeValues.Identity.TYPE_NAMES.includes(valueType)) {
            const validationResult = new ValidationResult();

            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue("content.value.@type must match one of the allowed Attribute value types for IdentityAttributes"),
                    "@type"
                )
            );
            return validationResult;
        }

        const contentSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema(`${valueType}JSON`));
        return contentSchemaValidator.validate(value.content.value);
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
        const createdLocalAttribute = await this.attributeController.createRepositoryAttribute(params);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdLocalAttribute));
    }
}
