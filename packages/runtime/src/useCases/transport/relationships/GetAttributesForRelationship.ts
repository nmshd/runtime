import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../../consumption";

export interface GetAttributesForRelationshipRequest {
    id: RelationshipIdString;
    hideTechnical?: boolean;
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
}

export interface GetAttributesForRelationshipResponse extends Array<LocalAttributeDTO> {}

class Validator extends SchemaValidator<GetAttributesForRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetAttributesForRelationshipRequest"));
    }
}

export class GetAttributesForRelationshipUseCase extends UseCase<GetAttributesForRelationshipRequest, GetAttributesForRelationshipResponse> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetAttributesForRelationshipRequest): Promise<Result<GetAttributesForRelationshipResponse>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.id));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        const query: any = {};
        if (request.onlyLatestVersions ?? true) query["succeededBy"] = { $exists: false };

        const attributes = await this.attributesController.getLocalAttributesExchangedWithPeer(relationship.peer.address, query, request.hideTechnical);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
