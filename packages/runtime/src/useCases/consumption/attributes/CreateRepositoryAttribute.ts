import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateRepositoryAttributeParams } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationResult } from "../../common";
import { IValidator } from "../../common/validation/IValidator";
import { AttributeMapper } from "./AttributeMapper";
import { IdentityAttributeValueValidator } from "./IdentityAttributeValueValidator";

interface AbstractCreateRepositoryAttributeRequest<T> {
    content: {
        value: T;
        tags?: string[];
    };
}

export interface CreateRepositoryAttributeRequest extends AbstractCreateRepositoryAttributeRequest<AttributeValues.Identity.Json> {}

export interface SchemaValidatableCreateRepositoryAttributeRequest extends AbstractCreateRepositoryAttributeRequest<unknown> {}

class Validator implements IValidator<CreateRepositoryAttributeRequest> {
    public constructor(@Inject private readonly schemaRepository: SchemaRepository) {}

    public validate(request: CreateRepositoryAttributeRequest): Promise<ValidationResult> | ValidationResult {
        const requestSchemaValidator = new SchemaValidator(this.schemaRepository.getSchema("CreateRepositoryAttributeRequest"));
        const requestValidationResult = requestSchemaValidator.validate(request);
        if (requestValidationResult.isInvalid()) return requestValidationResult;

        const identityAttributeValueValidator = new IdentityAttributeValueValidator(this.schemaRepository);
        return identityAttributeValueValidator.validate(request.content.value);
    }
}

export class CreateRepositoryAttributeUseCase extends UseCase<CreateRepositoryAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateRepositoryAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const repositoryAttributeDuplicate = await this.attributesController.getRepositoryAttributeWithSameValue(request.content.value);
        if (repositoryAttributeDuplicate) {
            return Result.fail(RuntimeErrors.attributes.cannotCreateDuplicateRepositoryAttribute(repositoryAttributeDuplicate.id));
        }

        const params = CreateRepositoryAttributeParams.from({
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                ...request.content
            }
        });
        const createdLocalAttribute = await this.attributesController.createRepositoryAttribute(params);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdLocalAttribute));
    }
}
