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
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteRepositoryAttributeRequest): Promise<Result<void>> {
        const repositoryAttributeId = CoreId.from(request.attributeId);
        const repositoryAttribute = await this.attributeController.getLocalAttribute(repositoryAttributeId);

        if (typeof repositoryAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!repositoryAttribute.isRepositoryAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(repositoryAttributeId));
        }

        // TODO:
        // const ownSharedIdentityAttributePredecessors = await this.attributeController.getSharedPredecessorsOfRepositoryAttribute(repositoryAttributeId, undefined, false);
        const ownSharedIdentityAttributePredecessors = await this.attributeController.getSharedVersionsOfRepositoryAttribute(repositoryAttributeId);
        for (const ownSharedAttribute of ownSharedIdentityAttributePredecessors) {
            if (!ownSharedAttribute.isOwnSharedAttribute(this.accountController.identity.address)) {
                return Result.fail(RuntimeErrors.attributes.isNotOwnSharedAttribute(ownSharedAttribute.id));
            }

            ownSharedAttribute.shareInfo.sourceAttribute = undefined;
            await this.attributeController.updateAttributeUnsafe(ownSharedAttribute);
        }

        const predecessors = await this.attributeController.getPredecessorsOfAttribute(repositoryAttributeId);
        for (const attr of [repositoryAttribute, ...predecessors]) {
            await this.attributeController.deleteAttribute(attr);
        }

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
