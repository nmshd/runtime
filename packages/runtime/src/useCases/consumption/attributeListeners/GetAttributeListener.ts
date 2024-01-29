import { Result } from "@js-soft/ts-utils";
import { AttributeListenersController, LocalAttributeListener } from "@nmshd/consumption";
import { CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeListenerDTO } from "../../../types";
import { AttributeListenerIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeListenerMapper } from "./AttributeListenerMapper";

export interface GetAttributeListenerRequest {
    id: AttributeListenerIdString;
}

class Validator extends SchemaValidator<GetAttributeListenerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetAttributeListenerRequest"));
    }
}

export class GetAttributeListenerUseCase extends UseCase<GetAttributeListenerRequest, LocalAttributeListenerDTO> {
    public constructor(
        @Inject private readonly attributeListenersController: AttributeListenersController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetAttributeListenerRequest): Promise<Result<LocalAttributeListenerDTO>> {
        const attributeListener = await this.attributeListenersController.getAttributeListener(CoreId.from(request.id));
        if (!attributeListener) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttributeListener));
        }

        const dto = AttributeListenerMapper.toAttributeListenerDTO(attributeListener);

        return Result.ok(dto);
    }
}
