import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreId, Relationship, RelationshipChange, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipDTO } from "../../../types";
import { RelationshipChangeIdString, RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

export interface RejectRelationshipChangeRequest {
    relationshipId: RelationshipIdString;
    changeId: RelationshipChangeIdString;
    content: any;
}

class Validator extends SchemaValidator<RejectRelationshipChangeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RejectRelationshipChangeRequest"));
    }
}

export class RejectRelationshipChangeUseCase extends UseCase<RejectRelationshipChangeRequest, RelationshipDTO> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: RejectRelationshipChangeRequest): Promise<Result<RelationshipDTO>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.relationshipId));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        if (!relationship.cache) {
            return Result.fail(RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString()));
        }

        const change = relationship.cache.changes.find((c) => c.id.toString() === request.changeId);
        if (!change) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipChange));
        }

        const updatedRelationship = await this.relationshipsController.rejectChange(change, request.content);

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(updatedRelationship));
    }
}
