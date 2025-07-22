import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, ThirdPartyRelationshipAttribute } from "@nmshd/consumption";
import { Notification, ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, MessageController, RelationshipsController, RelationshipStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest {
    attributeId: AttributeIdString;
}

export interface DeleteThirdPartyRelationshipAttributeAndNotifyPeerResponse {
    notificationId?: NotificationIdString;
}

class Validator extends SchemaValidator<DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest"));
    }
}

export class DeleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase extends UseCase<
    DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest,
    DeleteThirdPartyRelationshipAttributeAndNotifyPeerResponse
> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(
        request: DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest
    ): Promise<Result<DeleteThirdPartyRelationshipAttributeAndNotifyPeerResponse>> {
        const thirdPartyRelationshipAttributeId = CoreId.from(request.attributeId);
        const thirdPartyRelationshipAttribute = await this.attributesController.getLocalAttribute(thirdPartyRelationshipAttributeId);
        if (!thirdPartyRelationshipAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!(thirdPartyRelationshipAttribute instanceof ThirdPartyRelationshipAttribute)) {
            return Result.fail(RuntimeErrors.attributes.isNotThirdPartyRelationshipAttribute(thirdPartyRelationshipAttributeId));
        }

        const relationshipWithStatusPending = await this.relationshipsController.getRelationshipToIdentity(
            thirdPartyRelationshipAttribute.sharingInfo.peer,
            RelationshipStatus.Pending
        );
        if (relationshipWithStatusPending) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(thirdPartyRelationshipAttribute);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        await this.attributesController.executeFullAttributeDeletionProcess(thirdPartyRelationshipAttribute);

        const messageRecipientsValidationResult = await this.messageController.validateMessageRecipients([thirdPartyRelationshipAttribute.sharingInfo.peer]);
        if (messageRecipientsValidationResult.isError) return Result.ok({});

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem.from({ attributeId: thirdPartyRelationshipAttributeId });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [thirdPartyRelationshipAttribute.sharingInfo.peer],
            content: notification
        });

        await this.accountController.syncDatawallet();

        const result = { notificationId: notificationId.toString() };
        return Result.ok(result);
    }
}
