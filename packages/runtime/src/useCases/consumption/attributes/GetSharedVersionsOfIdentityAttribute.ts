import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetSharedVersionsOfIdentityAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<GetSharedVersionsOfIdentityAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetSharedVersionsOfIdentityAttributeRequest"));
    }
}

export class GetSharedVersionsOfIdentityAttributeUseCase extends UseCase<GetSharedVersionsOfIdentityAttributeRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetSharedVersionsOfIdentityAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(request.attributeId));

        if (typeof attribute === "undefined") {
            throw RuntimeErrors.general.recordNotFound(LocalAttribute);
        }

        if (attribute.isRelationshipAttribute()) {
            throw RuntimeErrors.general.invalidPropertyValue("Attribute '${request.attributeId}' is a RelationshipAttribute.");
        }

        const allVersions = await this.attributeController.getVersionsOfAttribute(CoreId.from(request.attributeId));

        // queried ID doesn't belong to a repository attribute
        if (attribute.shareInfo !== undefined) {
            return Result.ok(AttributeMapper.toAttributeDTOList(allVersions));
        }

        const query = {
            "shareInfo.sourceAttribute": { $in: allVersions.map((x) => x.id.toString()) }
        };

        const sharedAttributes = await this.attributeController.getLocalAttributes(query);

        return Result.ok(AttributeMapper.toAttributeDTOList(sharedAttributes));
    }
}
