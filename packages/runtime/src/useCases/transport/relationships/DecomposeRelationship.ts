import { ApplicationError, Result } from "@js-soft/ts-utils";
import { ConsumptionController } from "@nmshd/consumption";
import { AccountController, CachedRelationship, CoreId, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DecomposeRelationshipRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<DecomposeRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DecomposeRelationshipRequest"));
    }
}

export class DecomposeRelationshipUseCase extends UseCase<DecomposeRelationshipRequest, null> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly consumptionController: ConsumptionController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DecomposeRelationshipRequest): Promise<Result<null, ApplicationError>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.relationshipId));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        if (!relationship.cache) {
            return Result.fail(RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString()));
        }

        // backbone call first so nothing is deleted in case it goes wrong
        await this.relationshipsController.decompose(relationship.id);
        await this.accountController.cleanupDataOfDecomposedRelationship(relationship as Relationship & { cache: CachedRelationship });
        await this.consumptionController.deleteDataExchangedWithPeer(relationship.peer.address, relationship.id);

        await this.accountController.syncDatawallet();

        return Result.ok(null);
    }
}
