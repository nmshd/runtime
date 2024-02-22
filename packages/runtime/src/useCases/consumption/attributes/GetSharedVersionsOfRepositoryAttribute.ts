import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { AccountController, CoreAddress, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { AddressString, AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetSharedVersionsOfRepositoryAttributeRequest {
    attributeId: AttributeIdString;
    peers?: AddressString[];
    onlyLatestVersions?: boolean; // default: true
}

class Validator extends SchemaValidator<GetSharedVersionsOfRepositoryAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetSharedVersionsOfRepositoryAttributeRequest"));
    }
}

export class GetSharedVersionsOfRepositoryAttributeUseCase extends UseCase<GetSharedVersionsOfRepositoryAttributeRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetSharedVersionsOfRepositoryAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        const repositoryAttributeId = CoreId.from(request.attributeId);
        const repositoryAttribute = await this.attributeController.getLocalAttribute(repositoryAttributeId);

        if (typeof repositoryAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!repositoryAttribute.isRepositoryAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(repositoryAttributeId));
        }

        if (request.peers?.length === 0) {
            return Result.fail(RuntimeErrors.general.invalidPropertyValue("The `peers` property may not be an empty array."));
        }

        const peers = request.peers?.map((address) => CoreAddress.from(address));
        const sharedVersions = await this.attributeController.getSharedVersionsOfRepositoryAttribute(repositoryAttributeId, peers, request.onlyLatestVersions);

        return Result.ok(AttributeMapper.toAttributeDTOList(sharedVersions));
    }
}
