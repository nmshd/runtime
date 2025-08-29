import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute, OwnIdentityAttribute, OwnRelationshipAttribute, PeerRelationshipAttribute } from "@nmshd/consumption";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetSharedVersionsOfAttributeRequest {
    attributeId: AttributeIdString;
    peer: AddressString;
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
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetSharedVersionsOfAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        const localAttribute = await this.attributeController.getLocalAttribute(CoreId.from(request.attributeId));

        if (!localAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!(localAttribute instanceof OwnIdentityAttribute || localAttribute instanceof OwnRelationshipAttribute || localAttribute instanceof PeerRelationshipAttribute)) {
            return Result.fail(
                RuntimeErrors.general.invalidPropertyValue(
                    "The `attributeId` property must belong to an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute."
                )
            );
        }

        const sharedVersions = await this.attributeController.getSharedVersionsOfAttribute(localAttribute, CoreAddress.from(request.peer), request.onlyLatestVersions);

        return Result.ok(AttributeMapper.toAttributeDTOList(sharedVersions));
    }
}
