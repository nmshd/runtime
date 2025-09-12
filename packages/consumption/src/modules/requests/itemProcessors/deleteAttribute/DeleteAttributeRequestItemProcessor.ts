import { AcceptResponseItem, DeleteAttributeAcceptResponseItem, DeleteAttributeRequestItem, RejectResponseItem, Request, ResponseItemResult } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionStatus
} from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import { AcceptDeleteAttributeRequestItemParameters, AcceptDeleteAttributeRequestItemParametersJSON } from "./AcceptDeleteAttributeRequestItemParameters";

export class DeleteAttributeRequestItemProcessor extends GenericRequestItemProcessor<DeleteAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: DeleteAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (!attribute) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(`The Attribute '${requestItem.attributeId.toString()}' could not be found.`));
        }

        if (!recipient) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The recipient must be specified when sending a DeleteAttributeRequestItem."));
        }

        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The Attribute '${requestItem.attributeId.toString()}' is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute. You can only request the deletion of such Attributes.`
                )
            );
        }

        if (
            (attribute instanceof OwnIdentityAttribute && !attribute.isForwardedTo(recipient, true)) ||
            (attribute instanceof OwnRelationshipAttribute &&
                ((attribute.peerSharingInfo.peer.equals(recipient) && attribute.isDeletedOrToBeDeletedByPeer()) ||
                    (!attribute.peerSharingInfo.peer.equals(recipient) && !attribute.isForwardedTo(recipient, true))))
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The deletion of an own Attribute can only be requested from a peer it is shared with and who hasn't deleted it or agreed to its deletion already."
                )
            );
        }

        if (attribute instanceof PeerRelationshipAttribute) {
            if (attribute.peerSharingInfo.peer.equals(recipient)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The deletion of a PeerRelationshipAttribute cannot be requested for the owner."));
            }

            if (!attribute.isForwardedTo(recipient, true)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "The deletion of a PeerRelationshipAttribute can only be requested from a third party it is shared with and who hasn't deleted it or agreed to its deletion already."
                    )
                );
            }
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: DeleteAttributeRequestItem,
        params: AcceptDeleteAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptDeleteAttributeRequestItemParameters.from(params);
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (!attribute) return ValidationResult.success();

        if (
            !(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute) ||
            !attribute.peerSharingInfo.peer.equals(requestInfo.peer)
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The recipient isn't the peer of the Attribute and therefore isn't allowed to request the deletion of the Attribute."
                )
            );
        }

        const deletionDate = parsedParams.deletionDate;

        if (!deletionDate.dateTime.isValid) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The deletionDate is invalid."));
        }

        if (deletionDate.isBefore(CoreDate.utc())) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The deletionDate must be in the future."));
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: DeleteAttributeRequestItem,
        params: AcceptDeleteAttributeRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<DeleteAttributeAcceptResponseItem | AcceptResponseItem> {
        const attribute = (await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId)) as
            | PeerIdentityAttribute
            | PeerRelationshipAttribute
            | ThirdPartyRelationshipAttribute
            | undefined;
        if (!attribute) return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });

        const deletionDate = CoreDate.from(params.deletionDate);

        if (attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute) {
            const deletionInfo = ReceivedAttributeDeletionInfo.from({
                deletionStatus: ReceivedAttributeDeletionStatus.ToBeDeleted,
                deletionDate: deletionDate
            });

            await this.consumptionController.attributes.setPeerDeletionInfoOfPeerAttributeAndPredecessors(attribute, deletionInfo);

            return DeleteAttributeAcceptResponseItem.from({
                deletionDate: deletionDate,
                result: ResponseItemResult.Accepted
            });
        }

        const deletionInfo = ThirdPartyRelationshipAttributeDeletionInfo.from({
            deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus.ToBeDeleted,
            deletionDate: deletionDate
        });

        await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttributeAndPredecessors(attribute, deletionInfo);

        return DeleteAttributeAcceptResponseItem.from({
            deletionDate: deletionDate,
            result: ResponseItemResult.Accepted
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: DeleteAttributeAcceptResponseItem | AcceptResponseItem | RejectResponseItem,
        requestItem: DeleteAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (responseItem instanceof AcceptResponseItem && !(responseItem instanceof DeleteAttributeAcceptResponseItem)) {
            return;
        }

        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) return;

        if (responseItem instanceof DeleteAttributeAcceptResponseItem) {
            await this.setDeletionInfoForAcceptedRequestItem(attribute, responseItem.deletionDate, requestInfo.peer);
            return;
        }

        await this.setDeletionInfoForRejectedRequestItem(attribute, CoreDate.utc(), requestInfo.peer);
    }

    private async setDeletionInfoForAcceptedRequestItem(
        attribute: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute,
        deletionDate: CoreDate,
        peer: CoreAddress
    ): Promise<void> {
        const deletionInfo = EmittedAttributeDeletionInfo.from({
            deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
            deletionDate
        });

        const deletionWasRequestedFromInitialPeer = attribute instanceof OwnRelationshipAttribute && attribute.peerSharingInfo.peer.equals(peer);
        return deletionWasRequestedFromInitialPeer
            ? await this.consumptionController.attributes.setPeerDeletionInfoOfOwnRelationshipAttributeAndPredecessors(attribute, deletionInfo)
            : await this.consumptionController.attributes.setForwardedDeletionInfoOfAttributeAndPredecessors(attribute, deletionInfo, peer);
    }

    private async setDeletionInfoForRejectedRequestItem(
        attribute: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute,
        deletionDate: CoreDate,
        peer: CoreAddress
    ): Promise<void> {
        const deletionInfo = EmittedAttributeDeletionInfo.from({
            deletionStatus: EmittedAttributeDeletionStatus.DeletionRequestRejected,
            deletionDate
        });

        const deletionWasRequestedFromInitialPeer = attribute instanceof OwnRelationshipAttribute && attribute.peerSharingInfo.peer.equals(peer);
        return deletionWasRequestedFromInitialPeer
            ? await this.consumptionController.attributes.setPeerDeletionInfoOfOwnRelationshipAttributeAndPredecessors(attribute, deletionInfo)
            : await this.consumptionController.attributes.setForwardedDeletionInfoOfAttributeAndPredecessors(attribute, deletionInfo, peer);
    }
}
