import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetVersionsOfAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<GetVersionsOfAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetVersionsOfAttributeRequest"));
    }
}

export class GetVersionsOfAttributeUseCase extends UseCase<GetVersionsOfAttributeRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetVersionsOfAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!attribute) throw RuntimeErrors.general.recordNotFound(LocalAttribute);

        const allVersions = await this.attributeController.getVersionsOfAttribute(attribute);

        return Result.ok(AttributeMapper.toAttributeDTOList(allVersions));
    }
}
