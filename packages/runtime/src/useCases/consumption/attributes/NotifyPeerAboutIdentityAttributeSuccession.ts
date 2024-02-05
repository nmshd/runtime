import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, IAttributeSuccessorParams, LocalAttribute } from "@nmshd/consumption";
import { Notification, PeerSharedAttributeSucceededNotificationItem } from "@nmshd/content";
import { AccountController, CoreAddress, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { AddressString, AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface NotifyPeerAboutIdentityAttributeSuccessionResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
    notificationId: CoreId;
}

export interface NotifyPeerAboutIdentityAttributeSuccessionRequest {
    attributeId: AttributeIdString;
    peer: AddressString;
}

class Validator extends SchemaValidator<NotifyPeerAboutIdentityAttributeSuccessionRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("NotifyPeerAboutIdentityAttributeSuccessionRequest"));
    }
}

export class NotifyPeerAboutIdentityAttributeSuccessionUseCase extends UseCase<
    NotifyPeerAboutIdentityAttributeSuccessionRequest,
    NotifyPeerAboutIdentityAttributeSuccessionResponse
> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: NotifyPeerAboutIdentityAttributeSuccessionRequest): Promise<Result<NotifyPeerAboutIdentityAttributeSuccessionResponse>> {
        const repositoryAttributeSuccessorId = CoreId.from(request.attributeId);
        const repositoryAttributeSuccessor = await this.attributeController.getLocalAttribute(repositoryAttributeSuccessorId);

        if (typeof repositoryAttributeSuccessor === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute.name));
        }

        if (!repositoryAttributeSuccessor.isRepositoryAttribute()) {
            return Result.fail(RuntimeErrors.attributes.isNoIdentityAttribute(repositoryAttributeSuccessorId));
        }

        const candidatePredecessors = await this.attributeController.getSharedVersionsOfRepositoryAttribute(repositoryAttributeSuccessorId, [CoreAddress.from(request.peer)]);

        if (candidatePredecessors.length === 0) {
            return Result.fail(RuntimeErrors.attributes.noOtherVersionOfIdentityAttributeHasBeenSharedWithPeerBefore(repositoryAttributeSuccessorId, request.peer));
        }

        if (candidatePredecessors[0].shareInfo?.sourceAttribute?.toString() === request.attributeId) {
            return Result.fail(RuntimeErrors.attributes.identityAttributeHasAlreadyBeenSharedWithPeer(request.attributeId, request.peer, candidatePredecessors[0].id));
        }

        const ownSharedIdentityAttributePredecessor = candidatePredecessors[0];

        const notificationId = await ConsumptionIds.notification.generate();
        const successorParams: IAttributeSuccessorParams = {
            content: repositoryAttributeSuccessor.content,
            succeeds: ownSharedIdentityAttributePredecessor.id,
            shareInfo: { peer: ownSharedIdentityAttributePredecessor.shareInfo!.peer, sourceAttribute: repositoryAttributeSuccessor.id, notificationReference: notificationId },
            parentId: repositoryAttributeSuccessor.parentId
        };

        const validationResult = await this.attributeController.validateOwnSharedIdentityAttributeSuccession(ownSharedIdentityAttributePredecessor.id, successorParams);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        const { predecessor: updatedOwnSharedIdentityAttributePredecessor, successor: ownSharedIdentityAttributeSuccessor } =
            await this.attributeController.succeedOwnSharedIdentityAttribute(ownSharedIdentityAttributePredecessor.id, successorParams, false);

        const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
            predecessorId: ownSharedIdentityAttributePredecessor.id,
            successorId: ownSharedIdentityAttributeSuccessor.id,
            successorContent: ownSharedIdentityAttributeSuccessor.content
        });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [ownSharedIdentityAttributePredecessor.shareInfo!.peer],
            content: notification
        });

        await this.accountController.syncDatawallet();

        const result = {
            predecessor: AttributeMapper.toAttributeDTO(updatedOwnSharedIdentityAttributePredecessor),
            successor: AttributeMapper.toAttributeDTO(ownSharedIdentityAttributeSuccessor),
            notificationId: notificationId
        };
        return Result.ok(result);
    }
}
