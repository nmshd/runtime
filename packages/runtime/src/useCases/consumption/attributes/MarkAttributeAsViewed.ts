import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { AttributeMapper } from "./AttributeMapper.js";

export interface MarkAttributeAsViewedRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<MarkAttributeAsViewedRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("MarkAttributeAsViewedRequest"));
    }
}

export class MarkAttributeAsViewedUseCase extends UseCase<MarkAttributeAsViewedRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: MarkAttributeAsViewedRequest): Promise<Result<LocalAttributeDTO>> {
        const updatedAttribute = await this.attributesController.markAttributeAsViewed(CoreId.from(request.attributeId));

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(updatedAttribute));
    }
}
