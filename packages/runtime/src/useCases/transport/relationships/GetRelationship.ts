import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { RelationshipDTO } from "@nmshd/runtime-types";
import { Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { RelationshipMapper } from "./RelationshipMapper.js";

export interface GetRelationshipRequest {
    id: RelationshipIdString;
}

class Validator extends SchemaValidator<GetRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetRelationshipRequest"));
    }
}

export class GetRelationshipUseCase extends UseCase<GetRelationshipRequest, RelationshipDTO> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetRelationshipRequest): Promise<Result<RelationshipDTO>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.id));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        return Result.ok(RelationshipMapper.toRelationshipDTO(relationship));
    }
}
