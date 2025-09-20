import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { AttributeValues, IdentityAttribute } from "@nmshd/content";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";
import { AttributeMapper } from "./AttributeMapper";
import { IdentityAttributeValueValidator } from "./IdentityAttributeValueValidator";

interface AbstractCreateOwnIdentityAttributeRequest<T> {
    content: {
        value: T;
        tags?: string[];
    };
}

export interface CreateOwnIdentityAttributeRequest extends AbstractCreateOwnIdentityAttributeRequest<AttributeValues.Identity.Json> {}

export interface SchemaValidatableCreateOwnIdentityAttributeRequest extends AbstractCreateOwnIdentityAttributeRequest<unknown> {}

class Validator implements IValidator<CreateOwnIdentityAttributeRequest> {
    public constructor(@Inject private readonly schemaRepository: SchemaRepository) {}

    public validate(request: CreateOwnIdentityAttributeRequest): Promise<ValidationResult> | ValidationResult {
        const requestSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema("CreateOwnIdentityAttributeRequest"));
        const requestValidationResult = requestSchemaValidator.validate(request);
        if (requestValidationResult.isInvalid()) return requestValidationResult;

        const identityAttributeValueValidator = new IdentityAttributeValueValidator(this.schemaRepository);
        return identityAttributeValueValidator.validate(request.content.value);
    }
}

export class CreateOwnIdentityAttributeUseCase extends UseCase<CreateOwnIdentityAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateOwnIdentityAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const ownIdentityAttributeDuplicate = await this.attributesController.getOwnIdentityAttributeWithSameValue(request.content.value);
        if (ownIdentityAttributeDuplicate) {
            return Result.fail(RuntimeErrors.attributes.cannotCreateDuplicateOwnIdentityAttribute(ownIdentityAttributeDuplicate.id));
        }

        const createdLocalAttribute = await this.attributesController.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                owner: this.accountController.identity.address,
                ...request.content
            })
        });

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdLocalAttribute));
    }
}
