import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { AccountController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteRepositoryAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<DeleteRepositoryAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteRepositoryAttributeRequest"));
    }
}

export class DeleteRepositoryAttributeUseCase extends UseCase<DeleteRepositoryAttributeRequest, void> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteRepositoryAttributeRequest): Promise<Result<void>> {
        const repositoryAttributeId = CoreId.from(request.attributeId);
        const repositoryAttribute = await this.attributesController.getLocalAttribute(repositoryAttributeId);

        if (typeof repositoryAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!repositoryAttribute.isRepositoryAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(repositoryAttributeId));
        }

        const validationResult = await this.attributesController.validateSourceAttributeDeletion(repositoryAttribute);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        await this.attributesController.deleteSourceAttribute(repositoryAttribute);

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
