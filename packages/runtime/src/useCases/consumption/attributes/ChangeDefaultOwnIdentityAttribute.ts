import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute, OwnIdentityAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface ChangeDefaultOwnIdentityAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<ChangeDefaultOwnIdentityAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ChangeDefaultOwnIdentityAttributeRequest"));
    }
}

export class ChangeDefaultOwnIdentityAttributeUseCase extends UseCase<ChangeDefaultOwnIdentityAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ChangeDefaultOwnIdentityAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        if (!this.attributesController.parent.consumptionConfig.setDefaultRepositoryAttributes) {
            return Result.fail(RuntimeErrors.attributes.setDefaultRepositoryAttributesIsDisabled());
        }

        const newDefaultAttribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!newDefaultAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!(newDefaultAttribute instanceof OwnIdentityAttribute)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(CoreId.from(request.attributeId)));
        }

        if (newDefaultAttribute.succeededBy) {
            return Result.fail(RuntimeErrors.attributes.hasSuccessor(newDefaultAttribute));
        }

        const defaultOwnIdentityAttribute = await this.attributesController.setAsDefaultOwnIdentityAttribute(newDefaultAttribute, false);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(defaultOwnIdentityAttribute));
    }
}
