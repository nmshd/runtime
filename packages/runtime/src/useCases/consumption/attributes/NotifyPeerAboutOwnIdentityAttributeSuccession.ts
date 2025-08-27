import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, OwnIdentityAttribute } from "@nmshd/consumption";
import { Notification, PeerAttributeSucceededNotificationItem } from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface NotifyPeerAboutOwnIdentityAttributeSuccessionResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
    notificationId: NotificationIdString;
}

export interface NotifyPeerAboutOwnIdentityAttributeSuccessionRequest {
    attributeId: AttributeIdString;
    peer: AddressString;
}

class Validator extends SchemaValidator<NotifyPeerAboutOwnIdentityAttributeSuccessionRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("NotifyPeerAboutOwnIdentityAttributeSuccessionRequest"));
    }
}

export class NotifyPeerAboutOwnIdentityAttributeSuccessionUseCase extends UseCase<
    NotifyPeerAboutOwnIdentityAttributeSuccessionRequest,
    NotifyPeerAboutOwnIdentityAttributeSuccessionResponse
> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: NotifyPeerAboutOwnIdentityAttributeSuccessionRequest): Promise<Result<NotifyPeerAboutOwnIdentityAttributeSuccessionResponse>> {
        const attributeId = CoreId.from(request.attributeId);
        const attribute = await this.attributeController.getLocalAttribute(attributeId);

        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute.name));

        if (!(attribute instanceof OwnIdentityAttribute)) return Result.fail(RuntimeErrors.attributes.isNotOwnIdentityAttribute(attributeId));

        const peerAddress = CoreAddress.from(request.peer);
        const candidatePredecessors = await this.attributeController.getSharedVersionsOfAttribute(attribute, peerAddress);

        if (candidatePredecessors.length === 0) {
            return Result.fail(RuntimeErrors.attributes.peerHasNoPreviousVersionOfAttribute(attributeId, peerAddress));
        }

        const latestVersionSharedWithPeer = candidatePredecessors[0];
        if (latestVersionSharedWithPeer.id.toString() === request.attributeId) {
            return Result.fail(RuntimeErrors.attributes.ownIdentityAttributeHasAlreadyBeenSharedWithPeer(request.attributeId, peerAddress));
        }

        const latestSharedVersionIsSuccessor = await this.attributeController.isSubsequentInSuccession(attribute, latestVersionSharedWithPeer);
        if (latestSharedVersionIsSuccessor) {
            return Result.fail(
                RuntimeErrors.attributes.successorOfOwnIdentityAttributeHasAlreadyBeenSharedWithPeer(request.attributeId, latestVersionSharedWithPeer.id, peerAddress)
            );
        }

        const notificationId = await ConsumptionIds.notification.generate();
        const updatedAttribute = await this.attributeController.addForwardedSharingInfoToAttribute(attribute, peerAddress, notificationId);

        const notificationItem = PeerAttributeSucceededNotificationItem.from({
            predecessorId: latestVersionSharedWithPeer.id,
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
            predecessor: AttributeMapper.toAttributeDTO(latestVersionSharedWithPeer),
            successor: AttributeMapper.toAttributeDTO(updatedAttribute),
            notificationId: notificationId.toString()
        };
        return Result.ok(result);
    }
}
