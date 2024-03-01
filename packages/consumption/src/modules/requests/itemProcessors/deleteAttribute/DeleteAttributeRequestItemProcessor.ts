import { DeleteAttributeAcceptResponseItem, DeleteAttributeRequestItem, RejectResponseItem, Request, ResponseItemResult } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreErrors as TransportCoreErrors } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { DeletionStatus, LocalAttribute, LocalAttributeDeletionInfo } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import { AcceptDeleteAttributeRequestItemParametersJSON } from "./AcceptDeleteAttributeRequestItemParameters";

export class DeleteAttributeRequestItemProcessor extends GenericRequestItemProcessor<DeleteAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: DeleteAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);

        if (!attribute) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(`The Attribute with the given attributeId '${requestItem.attributeId.toString()}' could not be found.`)
            );
        }

        if (!attribute.isOwnSharedAttribute(this.accountController.identity.address)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(`The Attribute with the given attributeId '${requestItem.attributeId.toString()}' is not an own shared Attribute.`)
            );
        }

        if (attribute.deletionInfo?.deletionStatus === DeletionStatus.DeletedByPeer) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The Attribute was already deleted by the peer."));
        }

        if (attribute.deletionInfo?.deletionStatus === DeletionStatus.ToBeDeletedByPeer) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The peer already accepted the deletion of the Attribute."));
        }

        if (attribute.content.owner.equals(recipient)) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The deletion of an own Attribute doesn't need to be requested."));
        }

        if (!attribute.shareInfo.peer.equals(recipient)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem("The deletion of a shared Attribute can only be requested from the peer the Attribute is shared with.")
            );
        }

        return ValidationResult.success();
    }

    public override canAccept(_requestItem: DeleteAttributeRequestItem, params: AcceptDeleteAttributeRequestItemParametersJSON, _requestInfo: LocalRequestInfo): ValidationResult {
        const deletionDate = CoreDate.from(params.deletionDate);

        if (!deletionDate.dateTime.isValid) {
            return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The deletionDate is invalid."));
        }

        if (deletionDate.isBefore(CoreDate.utc())) {
            return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The deletionDate must be located in the future."));
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: DeleteAttributeRequestItem,
        params: AcceptDeleteAttributeRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<DeleteAttributeAcceptResponseItem> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (typeof attribute === "undefined") {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, requestItem.attributeId.toString());
        }

        const deletionDate = CoreDate.from(params.deletionDate);
        const deletionInfo = LocalAttributeDeletionInfo.from({
            deletionStatus: DeletionStatus.ToBeDeleted,
            deletionDate: deletionDate
        });

        attribute.setDeletionInfo(deletionInfo, this.accountController.identity.address);
        await this.consumptionController.attributes.updateAttributeUnsafe(attribute);

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);
        for (const predecessor of predecessors) {
            predecessor.setDeletionInfo(deletionInfo, this.accountController.identity.address);
            await this.consumptionController.attributes.updateAttributeUnsafe(predecessor);
        }

        return DeleteAttributeAcceptResponseItem.from({
            deletionDate: deletionDate,
            result: ResponseItemResult.Accepted
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: DeleteAttributeAcceptResponseItem | RejectResponseItem,
        requestItem: DeleteAttributeRequestItem,
        _requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof DeleteAttributeAcceptResponseItem)) {
            return;
        }

        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (typeof attribute === "undefined") return;

        if (attribute.deletionInfo?.deletionStatus === DeletionStatus.DeletedByPeer) return;

        const deletionInfo = LocalAttributeDeletionInfo.from({
            deletionStatus: DeletionStatus.ToBeDeletedByPeer,
            deletionDate: responseItem.deletionDate
        });
        attribute.setDeletionInfo(deletionInfo, this.accountController.identity.address);
        await this.consumptionController.attributes.updateAttributeUnsafe(attribute);

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);
        for (const predecessor of predecessors) {
            if (predecessor.deletionInfo?.deletionStatus !== DeletionStatus.DeletedByPeer) {
                predecessor.setDeletionInfo(deletionInfo, this.accountController.identity.address);
                await this.consumptionController.attributes.updateAttributeUnsafe(predecessor);
            }
        }
    }
}
