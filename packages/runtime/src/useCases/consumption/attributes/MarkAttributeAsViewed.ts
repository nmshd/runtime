import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { AttributeIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface MarkAttributeAsViewedRequest {
    id: AttributeIdString;
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
        const updatedAttribute = await this.attributesController.markAttributeAsViewed(CoreId.from(request.id));

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(updatedAttribute));
    }
}
