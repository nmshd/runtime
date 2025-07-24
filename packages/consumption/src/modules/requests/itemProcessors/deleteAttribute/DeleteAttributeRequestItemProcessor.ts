import { AcceptResponseItem, DeleteAttributeAcceptResponseItem, DeleteAttributeRequestItem, RejectResponseItem, Request, ResponseItemResult } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    ForwardedAttributeDeletionInfo,
    ForwardedAttributeDeletionStatus,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerAttributeDeletionInfo,
    PeerAttributeDeletionStatus,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ThirdPartyRelationshipAttribute
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

        if (!recipient) return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The recipient is not specified.")); // TODO:

        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            // TODO: message
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The Attribute '${requestItem.attributeId.toString()}' is not an own shared Attribute. You can only request the deletion of own shared Attributes.`
                )
            );
        }

        if (
            (attribute instanceof OwnIdentityAttribute && !attribute.isSharedWith(recipient)) ||
            (attribute instanceof PeerRelationshipAttribute && !attribute.isSharedWith(recipient)) ||
            (attribute instanceof OwnRelationshipAttribute &&
                (!attribute.isSharedWith(recipient) || (attribute.peerSharingInfo.peer.equals(recipient) && attribute.peerSharingInfo.deletionInfo)))
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The deletion of an own Attribute can only be requested from a peer it is shared with and who hasn't deleted it or agreed to its deletion already."
                )
            );
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

        // TODO: we should probably also check that the request peer and attribute peer match
        if (
            !(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute) ||
            !attribute.peerSharingInfo.peer.equals(requestInfo.peer)
        ) {
            // TODO:
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("TODO"));
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
        const deletionInfo = PeerAttributeDeletionInfo.from({
            deletionStatus: PeerAttributeDeletionStatus.ToBeDeleted,
            deletionDate: deletionDate
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        for (const attr of [attribute, ...predecessors]) {
            attr.setPeerDeletionInfo(deletionInfo);
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }

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
        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            return; // TODO: this seems fishy, maybe throw an error instead? Or is it safe enough to use a type cast?
        }

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
        const deletionInfo = ForwardedAttributeDeletionInfo.from({
            deletionStatus: ForwardedAttributeDeletionStatus.ToBeDeletedByPeer,
            deletionDate
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        const attributes = [attribute, ...predecessors];

        const deletionWasRequestedFromInitialPeer = attribute instanceof OwnRelationshipAttribute && attribute.peerSharingInfo.peer.equals(peer);
        return deletionWasRequestedFromInitialPeer
            ? this.setPeerDeletionInfo(attributes as OwnRelationshipAttribute[], deletionInfo)
            : this.setForwardedDeletionInfo(attributes, deletionInfo, peer);
    }

    private async setPeerDeletionInfo(attributes: OwnRelationshipAttribute[], deletionInfo: ForwardedAttributeDeletionInfo): Promise<void> {
        for (const attribute of attributes) {
            if (
                attribute.peerSharingInfo.deletionInfo?.deletionStatus !== ForwardedAttributeDeletionStatus.DeletedByPeer &&
                attribute.peerSharingInfo.deletionInfo?.deletionStatus !== ForwardedAttributeDeletionStatus.ToBeDeletedByPeer
            ) {
                attribute.setPeerDeletionInfo(deletionInfo);
                await this.consumptionController.attributes.updateAttributeUnsafe(attribute);
            }
        }
    }

    private async setForwardedDeletionInfo(
        attributes: (OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute)[],
        deletionInfo: ForwardedAttributeDeletionInfo,
        peer: CoreAddress
    ): Promise<void> {
        for (const attribute of attributes) {
            const sharingInfoOfPeer = attribute.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(peer));
            if (
                sharingInfoOfPeer?.deletionInfo?.deletionStatus !== ForwardedAttributeDeletionStatus.DeletedByPeer &&
                sharingInfoOfPeer?.deletionInfo?.deletionStatus !== ForwardedAttributeDeletionStatus.ToBeDeletedByPeer
            ) {
                attribute.setForwardedDeletionInfo(deletionInfo, peer);
                await this.consumptionController.attributes.updateAttributeUnsafe(attribute);
            }
        }
    }

    private async setDeletionInfoForRejectedRequestItem(
        attribute: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute,
        deletionDate: CoreDate,
        peer: CoreAddress
    ): Promise<void> {
        const deletionInfo = ForwardedAttributeDeletionInfo.from({
            deletionStatus: ForwardedAttributeDeletionStatus.DeletionRequestRejected,
            deletionDate
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        const attributes = [attribute, ...predecessors];

        const deletionWasRequestedFromInitialPeer = attribute instanceof OwnRelationshipAttribute && attribute.peerSharingInfo.peer.equals(peer);
        return deletionWasRequestedFromInitialPeer
            ? this.setPeerDeletionInfo(attributes as OwnRelationshipAttribute[], deletionInfo)
            : this.setForwardedDeletionInfo(attributes, deletionInfo, peer);
    }
}
