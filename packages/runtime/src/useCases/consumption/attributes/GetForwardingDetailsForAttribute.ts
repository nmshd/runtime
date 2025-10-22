import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeForwardingDetailsDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetForwardingDetailsForAttributeRequest {
    attributeId: string;
}

class Validator extends SchemaValidator<GetForwardingDetailsForAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetForwardingDetailsForAttributeRequest"));
    }
}

export class GetForwardingDetailsForAttributeUseCase extends UseCase<GetForwardingDetailsForAttributeRequest, LocalAttributeForwardingDetailsDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetForwardingDetailsForAttributeRequest): Promise<Result<LocalAttributeForwardingDetailsDTO[]>> {
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        const forwardingDetails = await this.attributeController.getForwardingDetailsForAttribute(attribute);
        const dtos = forwardingDetails.map((forwardingDetails) => AttributeMapper.toForwardingDetailsDTO(forwardingDetails));

        return Result.ok(dtos);
    }
}
