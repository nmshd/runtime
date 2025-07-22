import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, OwnIdentityAttribute } from "@nmshd/consumption";
import { Notification, OwnSharedAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, MessageController, RelationshipsController, RelationshipStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteRepositoryAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<DeleteRepositoryAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteRepositoryAttributeRequest"));
    }
}

export class DeleteRepositoryAttributeUseCase extends UseCase<DeleteRepositoryAttributeRequest, void> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    // TODO: and notify peers
    // TODO: "changed behavior": own IdentityAttribute can be deleted if it is shared with a peer with a pending relationship -> problem with sending Message
    protected async executeInternal(request: DeleteRepositoryAttributeRequest): Promise<Result<void>> {
        const ownIdentityAttribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!ownIdentityAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!(ownIdentityAttribute instanceof OwnIdentityAttribute)) {
            return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(request.attributeId)); // TODO:
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(ownIdentityAttribute);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        await this.notifyPeers(ownIdentityAttribute);

        await this.attributesController.executeFullAttributeDeletionProcess(ownIdentityAttribute);

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }

    // TODO: return notificationId
    private async notifyPeers(ownIdentityAttribute: OwnIdentityAttribute): Promise<void> {
        const peers = ownIdentityAttribute.getPeers();
        if (peers.length === 0) return;

        const queryForRelationshipsToNotify = {
            "peer.address": peers.map((peer) => peer.toString()),
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated] },
            "peerDeletionInfo.deletionStatus": { $ne: "Deleted" }
        };
        const relationshipsToNotify = await this.relationshipsController.getRelationships(queryForRelationshipsToNotify);
        if (relationshipsToNotify.length > 0) return;

        const peersToNotify = relationshipsToNotify.map((relationship) => relationship.peer.address);

        const notificationItem = OwnSharedAttributeDeletedByOwnerNotificationItem.from({ attributeId: ownIdentityAttribute.id });

        for (const peer of peersToNotify) {
            const notificationId = await ConsumptionIds.notification.generate();
            const notification = Notification.from({
                id: notificationId,
                items: [notificationItem]
            });

            // TODO: this will fail for relationships with status Pending -> maybe Backbone can queue then as well?
            await this.messageController.sendMessage({
                recipients: [peer],
                content: notification
            });
        }
    }
}
