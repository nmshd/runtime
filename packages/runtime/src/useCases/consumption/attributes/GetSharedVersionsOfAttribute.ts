import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetSharedVersionsOfAttributeRequest {
    attributeId: AttributeIdString;
    peers?: AddressString[];
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
}

class Validator extends SchemaValidator<GetSharedVersionsOfAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetSharedVersionsOfAttributeRequest"));
    }
}

export class GetSharedVersionsOfAttributeUseCase extends UseCase<GetSharedVersionsOfAttributeRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetSharedVersionsOfAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        const sourceAttributeId = CoreId.from(request.attributeId);
        const sourceAttribute = await this.attributeController.getLocalAttribute(sourceAttributeId);

        if (!sourceAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (request.peers?.length === 0) {
            return Result.fail(RuntimeErrors.general.invalidPropertyValue("The `peers` property may not be an empty array."));
        }

        const peers = request.peers?.map((address) => CoreAddress.from(address));
        const sharedVersions = await this.attributeController.getSharedVersionsOfAttribute(sourceAttributeId, peers, request.onlyLatestVersions);

        return Result.ok(AttributeMapper.toAttributeDTOList(sharedVersions));
    }
}
