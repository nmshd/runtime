import { ApplicationError, Result } from "@js-soft/ts-utils";
import { ConsumptionController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DecomposeRelationshipRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<DecomposeRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DecomposeRelationshipRequest"));
    }
}

export class DecomposeRelationshipUseCase extends UseCase<DecomposeRelationshipRequest, void> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly consumptionController: ConsumptionController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DecomposeRelationshipRequest): Promise<Result<void, ApplicationError>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.relationshipId));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        // Backbone call first so nothing is deleted in case it goes wrong
        await this.relationshipsController.decompose(relationship.id);

        await this.accountController.cleanupDataOfDecomposedRelationship(relationship);
        await this.consumptionController.cleanupDataOfDecomposedRelationship(relationship.peer.address, relationship.id);

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
