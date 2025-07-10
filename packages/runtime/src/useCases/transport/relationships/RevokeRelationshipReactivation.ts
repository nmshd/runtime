import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { RelationshipDTO } from "@nmshd/runtime-types";
import { AccountController, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

export interface RevokeRelationshipReactivationRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<RevokeRelationshipReactivationRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RevokeRelationshipReactivationRequest"));
    }
}

export class RevokeRelationshipReactivationUseCase extends UseCase<RevokeRelationshipReactivationRequest, RelationshipDTO> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: RevokeRelationshipReactivationRequest): Promise<Result<RelationshipDTO>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.relationshipId));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        if (!relationship.cache) {
            return Result.fail(RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString()));
        }

        const updatedRelationship = await this.relationshipsController.revokeReactivation(relationship.id);

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(updatedRelationship));
    }
}
