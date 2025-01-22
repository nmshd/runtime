import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { Inject } from "@nmshd/typescript-ioc";
import { ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";
import { IdentityAttributeValueTypeValidator } from "./CreateRepositoryAttribute";

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

    public validate(value: CanCreateRepositoryAttributeRequest): ValidationResult {
        const requestSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema("CanCreateRepositoryAttributeRequest"));
        return requestSchemaValidator.validate(value);
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
        @Inject private readonly validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CanCreateRepositoryAttributeRequest): Promise<Result<CanCreateRepositoryAttributeResponse>> {
        const attributeValueTypeValidator = new IdentityAttributeValueTypeValidator(this.validator["schemaRepository"]);
        const validationResult = await attributeValueTypeValidator.validate(request);
        if (validationResult.isInvalid()) {
            const failures = validationResult.getFailures();
            return Result.ok({ isSuccess: false, code: failures[0].error.code, message: failures[0].error.message });
        }

        const repositoryAttributeDuplicate = await this.attributesController.getRepositoryAttributeWithSameValue(request.content.value);
        if (repositoryAttributeDuplicate) {
            const error = RuntimeErrors.attributes.cannotCreateDuplicateRepositoryAttribute(repositoryAttributeDuplicate.id);
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        return Result.ok({ isSuccess: true });
    }
}
