import { AcceptResponseItem, DeleteAttributeAcceptResponseItem, DeleteAttributeRequestItem, RejectResponseItem, Request, ResponseItemResult } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { LocalAttributeDeletionInfo, LocalAttributeDeletionInfoStatus } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import { AcceptDeleteAttributeRequestItemParameters, AcceptDeleteAttributeRequestItemParametersJSON } from "./AcceptDeleteAttributeRequestItemParameters";

export class DeleteAttributeRequestItemProcessor extends GenericRequestItemProcessor<DeleteAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: DeleteAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (!attribute) return ValidationResult.error(CoreErrors.requests.invalidRequestItem(`The Attribute '${requestItem.attributeId.toString()}' could not be found.`));

        if (!attribute.isOwnSharedAttribute(this.accountController.identity.address)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    `The Attribute '${requestItem.attributeId.toString()}' is not an own shared Attribute. You can only request the deletion of own shared Attributes.`
                )
            );
        }

        if (attribute.deletionInfo?.deletionStatus === LocalAttributeDeletionInfoStatus.DeletedByPeer) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The Attribute was already deleted by the peer."));
        }

        if (attribute.deletionInfo?.deletionStatus === LocalAttributeDeletionInfoStatus.ToBeDeletedByPeer) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The peer already accepted the deletion of the Attribute."));
        }

        if (!attribute.shareInfo.peer.equals(recipient)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem("The deletion of a shared Attribute can only be requested from the peer the Attribute is shared with.")
            );
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: DeleteAttributeRequestItem,
        params: AcceptDeleteAttributeRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptDeleteAttributeRequestItemParameters.from(params);
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (!attribute) return ValidationResult.success();

        const deletionDate = parsedParams.deletionDate;

        if (!deletionDate.dateTime.isValid) {
            return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The deletionDate is invalid."));
        }

        if (deletionDate.isBefore(CoreDate.utc())) {
            return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The deletionDate must be in the future."));
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: DeleteAttributeRequestItem,
        params: AcceptDeleteAttributeRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<DeleteAttributeAcceptResponseItem | AcceptResponseItem> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (!attribute) return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });

        const deletionDate = CoreDate.from(params.deletionDate);
        const deletionInfo = LocalAttributeDeletionInfo.from({
            deletionStatus: LocalAttributeDeletionInfoStatus.ToBeDeleted,
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
        if (responseItem instanceof AcceptResponseItem && !(responseItem instanceof DeleteAttributeAcceptResponseItem)) {
            return;
        }

        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (!attribute) return;

        if (attribute.deletionInfo?.deletionStatus === LocalAttributeDeletionInfoStatus.DeletedByPeer) return;

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);

        if (responseItem instanceof DeleteAttributeAcceptResponseItem) {
            const deletionInfo = LocalAttributeDeletionInfo.from({
                deletionStatus: LocalAttributeDeletionInfoStatus.ToBeDeletedByPeer,
                deletionDate: responseItem.deletionDate
            });

            for (const attr of [attribute, ...predecessors]) {
                if (attr.deletionInfo?.deletionStatus !== LocalAttributeDeletionInfoStatus.DeletedByPeer) {
                    attr.setDeletionInfo(deletionInfo, this.accountController.identity.address);
                    await this.consumptionController.attributes.updateAttributeUnsafe(attr);
                }
            }
        }

        if (responseItem instanceof RejectResponseItem) {
            const deletionInfo = LocalAttributeDeletionInfo.from({
                deletionStatus: LocalAttributeDeletionInfoStatus.DeletionRequestRejected,
                deletionDate: CoreDate.utc()
            });

            for (const attr of [attribute, ...predecessors]) {
                if (
                    attr.deletionInfo?.deletionStatus !== LocalAttributeDeletionInfoStatus.ToBeDeletedByPeer &&
                    attr.deletionInfo?.deletionStatus !== LocalAttributeDeletionInfoStatus.DeletedByPeer
                ) {
                    attr.setDeletionInfo(deletionInfo, this.accountController.identity.address);
                    await this.consumptionController.attributes.updateAttributeUnsafe(attr);
                }
            }
        }
    }
}
