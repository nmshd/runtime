import { AcceptResponseItem, DeleteAttributeAcceptResponseItem, DeleteAttributeRequestItem, RejectResponseItem, Request, ResponseItemResult } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { DeletionStatus, LocalAttributeDeletionInfo } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import { AcceptDeleteAttributeRequestItemParametersJSON } from "./AcceptDeleteAttributeRequestItemParameters";

export class DeleteAttributeRequestItemProcessor extends GenericRequestItemProcessor<DeleteAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: DeleteAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);

        if (typeof attribute === "undefined") {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem(`The Attribute '${requestItem.attributeId.toString()}' could not be found.`));
        }

        if (!attribute.isOwnSharedAttribute(this.accountController.identity.address)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    `The Attribute '${requestItem.attributeId.toString()}' is not an own shared Attribute. You can only request the deletion of own shared Attributes.`
                )
            );
        }

        if (attribute.deletionInfo?.deletionStatus === DeletionStatus.DeletedByPeer) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The Attribute was already deleted by the peer."));
        }

        if (attribute.deletionInfo?.deletionStatus === DeletionStatus.ToBeDeletedByPeer) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The peer already accepted the deletion of the Attribute."));
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
    ): Promise<DeleteAttributeAcceptResponseItem | AcceptResponseItem> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (typeof attribute === "undefined") {
            return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
        }

        const deletionDate = CoreDate.from(params.deletionDate);
        const deletionInfo = LocalAttributeDeletionInfo.from({
            deletionStatus: DeletionStatus.ToBeDeleted,
            deletionDate: deletionDate
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);
        for (const attr of [attribute, ...predecessors]) {
            attr.setDeletionInfo(deletionInfo, this.accountController.identity.address);
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

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);

        for (const attr of [attribute, ...predecessors]) {
            if (attr.deletionInfo?.deletionStatus !== DeletionStatus.DeletedByPeer) {
                attr.setDeletionInfo(deletionInfo, this.accountController.identity.address);
                await this.consumptionController.attributes.updateAttributeUnsafe(attr);
            }
        }
    }
}
