import { Result } from "@js-soft/ts-utils";
import { AttributesController, AttributeSuccessorParams, ConsumptionCoreErrors, ConsumptionIds } from "@nmshd/consumption";
import { AttributeValues, Notification, PeerSharedAttributeSucceededNotificationItem, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, ISO8601DateTimeString, NotificationIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface SucceedRelationshipAttributeAndNotifyPeerResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
    notificationId: NotificationIdString;
}

export interface SucceedRelationshipAttributeAndNotifyPeerRequest {
    predecessorId: AttributeIdString;
    successorContent: {
        value: AttributeValues.Relationship.Json;
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
}

class Validator extends SchemaValidator<SucceedRelationshipAttributeAndNotifyPeerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SucceedRelationshipAttributeAndNotifyPeerRequest"));
    }
}

export class SucceedRelationshipAttributeAndNotifyPeerUseCase extends UseCase<SucceedRelationshipAttributeAndNotifyPeerRequest, SucceedRelationshipAttributeAndNotifyPeerResponse> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SucceedRelationshipAttributeAndNotifyPeerRequest): Promise<Result<SucceedRelationshipAttributeAndNotifyPeerResponse>> {
        const predecessor = await this.attributeController.getLocalAttribute(CoreId.from(request.predecessorId));
        if (!predecessor) return Result.fail(ConsumptionCoreErrors.attributes.predecessorDoesNotExist());

        if (!predecessor.isOwnSharedRelationshipAttribute(this.accountController.identity.address, predecessor.shareInfo?.peer)) {
            return Result.fail(ConsumptionCoreErrors.attributes.predecessorIsNotOwnSharedRelationshipAttribute());
        }

        const notificationId = await ConsumptionIds.notification.generate();
        const predecessorId = CoreId.from(request.predecessorId);
        const att: RelationshipAttributeJSON = {
            "@type": "RelationshipAttribute",
            ...request.successorContent,
            confidentiality: predecessor.content.confidentiality,
            isTechnical: predecessor.content.isTechnical,
            key: predecessor.content.key,
            owner: predecessor.content.owner.toString()
        };
        const successorParams = AttributeSuccessorParams.from({
            content: RelationshipAttribute.from(att),
            shareInfo: { peer: predecessor.shareInfo.peer, notificationReference: notificationId }
        });
        const validationResult = await this.attributeController.validateOwnSharedRelationshipAttributeSuccession(predecessorId, successorParams);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        const { predecessor: updatedPredecessor, successor } = await this.attributeController.succeedOwnSharedRelationshipAttribute(predecessorId, successorParams, false);

        const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
            predecessorId: predecessor.id,
            successorId: successor.id,
            successorContent: successor.content
        });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [predecessor.shareInfo.peer],
            content: notification
        });

        const response: SucceedRelationshipAttributeAndNotifyPeerResponse = {
            predecessor: AttributeMapper.toAttributeDTO(updatedPredecessor),
            successor: AttributeMapper.toAttributeDTO(successor),
            notificationId: notificationId.toString()
        };

        return Result.ok(response);
    }
}
