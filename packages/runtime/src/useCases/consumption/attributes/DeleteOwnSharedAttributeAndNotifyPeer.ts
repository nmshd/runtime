import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute } from "@nmshd/consumption";
import { Notification, OwnSharedAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, MessageController, RelationshipsController, RelationshipStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteOwnSharedAttributeAndNotifyPeerRequest {
    attributeId: AttributeIdString;
}

export interface DeleteOwnSharedAttributeAndNotifyPeerResponse {
    notificationId?: NotificationIdString;
}

class Validator extends SchemaValidator<DeleteOwnSharedAttributeAndNotifyPeerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteOwnSharedAttributeAndNotifyPeerRequest"));
    }
}

export class DeleteOwnSharedAttributeAndNotifyPeerUseCase extends UseCase<DeleteOwnSharedAttributeAndNotifyPeerRequest, DeleteOwnSharedAttributeAndNotifyPeerResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteOwnSharedAttributeAndNotifyPeerRequest): Promise<Result<DeleteOwnSharedAttributeAndNotifyPeerResponse>> {
        const ownSharedAttributeId = CoreId.from(request.attributeId);
        const ownSharedAttribute = await this.attributesController.getLocalAttribute(ownSharedAttributeId);
        if (!ownSharedAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!ownSharedAttribute.isOwnSharedAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotOwnSharedAttribute(ownSharedAttributeId));
        }

        const relationshipWithStatusPending = await this.relationshipsController.getRelationshipToIdentity(ownSharedAttribute.shareInfo.peer, RelationshipStatus.Pending);
        if (relationshipWithStatusPending) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(ownSharedAttribute);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        await this.attributesController.executeFullAttributeDeletionProcess(ownSharedAttribute);

        const messageRecipientsValidationResult = await this.messageController.validateMessageRecipients([ownSharedAttribute.shareInfo.peer]);
        if (messageRecipientsValidationResult.isError) {
            return Result.ok({});
        }

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = OwnSharedAttributeDeletedByOwnerNotificationItem.from({ attributeId: ownSharedAttributeId });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [ownSharedAttribute.shareInfo.peer],
            content: notification
        });

        await this.accountController.syncDatawallet();

        const result = { notificationId: notificationId.toString() };
        return Result.ok(result);
    }
}
