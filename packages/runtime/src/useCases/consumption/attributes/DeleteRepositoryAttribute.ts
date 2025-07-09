import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
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
        const repositoryAttribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!repositoryAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!repositoryAttribute.isRepositoryAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(request.attributeId));
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(repositoryAttribute);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        await this.attributesController.executeFullAttributeDeletionProcess(repositoryAttribute);

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
