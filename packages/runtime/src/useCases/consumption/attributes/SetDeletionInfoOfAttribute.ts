import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute, LocalAttributeDeletionInfo } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDeletionStatus, LocalAttributeDTO } from "../../../types";
import { ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface SetDeletionInfoOfAttributeRequest {
    attributeId: string;
    deletionInfo: {
        deletionStatus: LocalAttributeDeletionStatus;
        deletionDate: ISO8601DateTimeString;
    };
}

class Validator extends SchemaValidator<SetDeletionInfoOfAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SetDeletionInfoOfAttributeRequest"));
    }
}

export class SetDeletionInfoOfAttributeUseCase extends UseCase<SetDeletionInfoOfAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SetDeletionInfoOfAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute.name));

        attribute.setDeletionInfo(LocalAttributeDeletionInfo.from(request.deletionInfo), this.accountController.identity.address);
        await this.attributeController.updateAttributeUnsafe(attribute);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(attribute));
    }
}
