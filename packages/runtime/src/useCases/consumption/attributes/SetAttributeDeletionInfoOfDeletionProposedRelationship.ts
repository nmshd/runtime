import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest"));
    }
}

export class SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase extends UseCase<SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest, void> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest): Promise<Result<void>> {
        await this.attributeController.setAttributeDeletionInfoOfDeletionProposedRelationship(CoreId.from(request.relationshipId));

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
