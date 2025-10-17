import { Result } from "@js-soft/ts-utils";
import { AttributesController, OwnIdentityAttribute, OwnRelationshipAttribute, PeerRelationshipAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController, Relationship, RelationshipsController, RelationshipStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest"));
    }
}

export class DeleteSharedAttributesForRejectedOrRevokedRelationshipUseCase extends UseCase<DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest, void> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest): Promise<Result<void>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.relationshipId));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        if (!(relationship.status === RelationshipStatus.Rejected || relationship.status === RelationshipStatus.Revoked)) {
            return Result.fail(RuntimeErrors.relationships.isNeitherRejectedNorRevoked());
        }

        const sharedAttributes = await this.attributesController.getLocalAttributes({
            peer: relationship.peer.address.toString(),
            forwardedSharingDetails: { $exists: false }
        });

        for (const sharedAttribute of sharedAttributes) {
            const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(sharedAttribute);
            if (validationResult.isError()) {
                return Result.fail(validationResult.error);
            }

            await this.attributesController.executeFullAttributeDeletionProcess(sharedAttribute);
        }

        const queryForForwardedAttributes = {
            "@type": { $in: ["OwnIdentityAttribute", "OwnRelationshipAttribute", "PeerRelationshipAttribute"] },
            "forwardedSharingDetails.peer": relationship.peer.address.toString()
        };
        const forwardedAttributes = (await this.attributesController.getLocalAttributes(queryForForwardedAttributes)) as (
            | OwnIdentityAttribute
            | OwnRelationshipAttribute
            | PeerRelationshipAttribute
        )[];

        for (const forwardedAttribute of forwardedAttributes) {
            await this.attributesController.removeForwardingDetailsFromAttribute(forwardedAttribute, relationship.peer.address);
        }

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
