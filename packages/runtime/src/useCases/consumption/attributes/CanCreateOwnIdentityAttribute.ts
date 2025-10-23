import { ServalError } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { AttributeValues, IdentityAttribute } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";
import { IdentityAttributeValueValidator } from "./IdentityAttributeValueValidator";

interface AbstractCanCreateOwnIdentityAttributeRequest<T> {
    content: {
        value: T;
        tags?: string[];
    };
}

export interface CanCreateOwnIdentityAttributeRequest extends AbstractCanCreateOwnIdentityAttributeRequest<AttributeValues.Identity.Json> {}

export interface SchemaValidatableCanCreateOwnIdentityAttributeRequest extends AbstractCanCreateOwnIdentityAttributeRequest<unknown> {}

class Validator implements IValidator<CanCreateOwnIdentityAttributeRequest> {
    public constructor(@Inject private readonly schemaRepository: SchemaRepository) {}

    public validate(request: CanCreateOwnIdentityAttributeRequest): ValidationResult {
        const requestSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema("CanCreateOwnIdentityAttributeRequest"));
        return requestSchemaValidator.validate(request);
    }
}

export type CanCreateOwnIdentityAttributeResponse =
    | { isSuccess: true }
    | {
          isSuccess: false;
          code: string;
          message: string;
      };

export class CanCreateOwnIdentityAttributeUseCase extends UseCase<CanCreateOwnIdentityAttributeRequest, CanCreateOwnIdentityAttributeResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly schemaRepository: SchemaRepository,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CanCreateOwnIdentityAttributeRequest): Promise<Result<CanCreateOwnIdentityAttributeResponse>> {
        const identityAttributeValueValidator = new IdentityAttributeValueValidator(this.schemaRepository);
        const attributeValueValidationResult = await identityAttributeValueValidator.validate(request.content.value);
        if (attributeValueValidationResult.isInvalid()) {
            const failures = attributeValueValidationResult.getFailures();
            return Result.ok({ isSuccess: false, code: failures[0].error.code, message: failures[0].error.message });
        }

        try {
            IdentityAttribute.from({ owner: "", value: request.content.value, tags: request.content.tags });
        } catch (e: any) {
            if (!(e instanceof ServalError)) throw e;

            return Result.ok({ isSuccess: false, code: "error.runtime.validation.invalidPropertyValue", message: e.message });
        }

        const ownIdentityAttributeDuplicate = await this.attributesController.getOwnIdentityAttributeWithSameValue(request.content.value);
        if (ownIdentityAttributeDuplicate) {
            const error = RuntimeErrors.attributes.cannotCreateDuplicateOwnIdentityAttribute(ownIdentityAttributeDuplicate.id);
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        if (request.content.tags && request.content.tags.length > 0) {
            const tagValidationResult = await this.attributesController.validateTagsForType(request.content.tags, request.content.value["@type"]);
            if (tagValidationResult.isError()) return Result.ok({ isSuccess: false, code: tagValidationResult.error.code, message: tagValidationResult.error.message });
        }

        return Result.ok({ isSuccess: true });
    }
}
