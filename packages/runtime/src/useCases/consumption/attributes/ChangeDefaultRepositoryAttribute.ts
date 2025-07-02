import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface ChangeDefaultRepositoryAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<ChangeDefaultRepositoryAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ChangeDefaultRepositoryAttributeRequest"));
    }
}

export class ChangeDefaultRepositoryAttributeUseCase extends UseCase<ChangeDefaultRepositoryAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ChangeDefaultRepositoryAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        if (!this.attributesController.parent.consumptionConfig.setDefaultRepositoryAttributes) {
            return Result.fail(RuntimeErrors.attributes.setDefaultRepositoryAttributesIsDisabled());
        }

        const newDefaultAttribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!newDefaultAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!newDefaultAttribute.isRepositoryAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(CoreId.from(request.attributeId)));
        }

        if (newDefaultAttribute.succeededBy) {
            return Result.fail(RuntimeErrors.attributes.hasSuccessor(newDefaultAttribute));
        }

        const defaultRepositoryAttribute = await this.attributesController.setAsDefaultRepositoryAttribute(newDefaultAttribute, false);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(defaultRepositoryAttribute));
    }
}
