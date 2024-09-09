import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetAttributeRequest {
    id: AttributeIdString;
}

class Validator extends SchemaValidator<GetAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetAttributeRequest"));
    }
}

export class GetAttributeUseCase extends UseCase<GetAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(request.id));
        if (!attribute) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        return Result.ok(AttributeMapper.toAttributeDTO(attribute));
    }
}
