import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreId, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipDTO, RelationshipStatus } from "../../../types";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

export interface RevokeRelationshipRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<RevokeRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RevokeRelationshipRequest"));
    }
}

export class RevokeRelationshipUseCase extends UseCase<RevokeRelationshipRequest, RelationshipDTO> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: RevokeRelationshipRequest): Promise<Result<RelationshipDTO>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.relationshipId));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        if (!relationship.cache) {
            return Result.fail(RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString()));
        }

        if (relationship.status !== RelationshipStatus.Pending) {
            return Result.fail(RuntimeErrors.relationships.wrongRelationshipStatus(relationship.id.toString(), relationship.status));
        }

        const updatedRelationship = await this.relationshipsController.revoke(relationship.id);

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(updatedRelationship));
    }
}
