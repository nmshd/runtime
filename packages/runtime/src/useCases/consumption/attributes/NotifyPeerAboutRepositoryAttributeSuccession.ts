import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, OwnIdentityAttribute } from "@nmshd/consumption";
import { Notification, PeerSharedAttributeSucceededNotificationItem } from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface NotifyPeerAboutRepositoryAttributeSuccessionResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
    notificationId: NotificationIdString;
}

export interface NotifyPeerAboutRepositoryAttributeSuccessionRequest {
    attributeId: AttributeIdString;
    peer: AddressString;
}

class Validator extends SchemaValidator<NotifyPeerAboutRepositoryAttributeSuccessionRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("NotifyPeerAboutRepositoryAttributeSuccessionRequest"));
    }
}

export class NotifyPeerAboutRepositoryAttributeSuccessionUseCase extends UseCase<
    NotifyPeerAboutRepositoryAttributeSuccessionRequest,
    NotifyPeerAboutRepositoryAttributeSuccessionResponse
> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: NotifyPeerAboutRepositoryAttributeSuccessionRequest): Promise<Result<NotifyPeerAboutRepositoryAttributeSuccessionResponse>> {
        const attributeId = CoreId.from(request.attributeId);
        const attribute = await this.attributeController.getLocalAttribute(attributeId);

        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute.name));

        if (!(attribute instanceof OwnIdentityAttribute)) return Result.fail(RuntimeErrors.attributes.isNotRepositoryAttribute(attributeId));

        const peerAddress = CoreAddress.from(request.peer);
        const candidatePredecessors = await this.attributeController.getSharedVersionsOfAttribute(attribute, peerAddress);

        if (candidatePredecessors.length === 0) {
            // TODO: or is deleted or to be deleted
            return Result.fail(RuntimeErrors.attributes.noPreviousVersionOfRepositoryAttributeHasBeenSharedWithPeerBefore(attributeId, peerAddress));
        }

        const predecessorSharedWithPeer = candidatePredecessors[0];
        if (predecessorSharedWithPeer.id.toString() === request.attributeId) {
            return Result.fail(RuntimeErrors.attributes.repositoryAttributeHasAlreadyBeenSharedWithPeer(request.attributeId, peerAddress, predecessorSharedWithPeer.id));
        }

        const notificationId = await ConsumptionIds.notification.generate();
        const updatedAttribute = await this.attributeController.addSharingInfoToOwnIdentityAttribute(attribute, peerAddress, notificationId);

        const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
            predecessorId: predecessorSharedWithPeer.id,
            successorId: updatedAttribute.id,
            successorContent: updatedAttribute.content
        });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });

        await this.messageController.sendMessage({
            recipients: [peerAddress],
            content: notification
        });

        await this.accountController.syncDatawallet();

        const result = {
            predecessor: AttributeMapper.toAttributeDTO(predecessorSharedWithPeer),
            successor: AttributeMapper.toAttributeDTO(updatedAttribute),
            notificationId: notificationId.toString()
        };
        return Result.ok(result);
    }
}
