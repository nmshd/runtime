import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { AccountController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
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
        const repositoryAttribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!repositoryAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!repositoryAttribute.isRepositoryAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(CoreId.from(request.attributeId)));
        }

        const defaultRepositoryAttribute = await this.attributesController.changeDefaultRepositoryAttribute(repositoryAttribute);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(defaultRepositoryAttribute));
    }
}
