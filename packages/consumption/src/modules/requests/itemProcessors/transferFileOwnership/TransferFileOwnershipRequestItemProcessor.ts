import {
    IdentityAttribute,
    IdentityFileReference,
    RejectResponseItem,
    Request,
    ResponseItemResult,
    TransferFileOwnershipAcceptResponseItem,
    TransferFileOwnershipRequestItem
} from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { File } from "@nmshd/transport";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class TransferFileOwnershipRequestItemProcessor extends GenericRequestItemProcessor<TransferFileOwnershipRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: TransferFileOwnershipRequestItem, _request: Request, _recipient?: CoreAddress): Promise<ValidationResult> {
        const foundFile = await this.accountController.files.getFile(CoreId.from(requestItem.fileReference.id));

        if (!foundFile) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The File with the given ID '${requestItem.fileReference.id.toString()}' could not be found.`)
            );
        }

        if (!foundFile.isOwn) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot request the transfer of ownership of the File with ID '${requestItem.fileReference.id.toString()}' since it is not owned by you.`
                )
            );
        }

        if (foundFile.expiresAt.isExpired()) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot request the transfer of ownership of the File with ID '${requestItem.fileReference.id.toString()}' since it is already expired.`
                )
            );
        }

        if (foundFile.tags && foundFile.tags.length > 0) {
            const tagValidationResult = await this.consumptionController.attributes.validateTagsForType(foundFile.tags, "IdentityFileReference");
            if (tagValidationResult.isError()) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `You cannot request the transfer of ownership of the File with ID '${requestItem.fileReference.id.toString()}' since it has invalid tags. ${tagValidationResult.error.message}`
                    )
                );
            }
        }

        const validationResult = await this.accountController.files.validateFileOwnershipToken(foundFile.id, requestItem.ownershipToken);
        if (!validationResult.isValid) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The specified ownershipToken is not valid for the File with ID '${requestItem.fileReference.id.toString()}'.`)
            );
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: TransferFileOwnershipRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        let file: File;
        try {
            file = await this.accountController.files.getOrLoadFileByReference(requestItem.fileReference);
        } catch (_) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot accept this RequestItem since the File with the given ID '${requestItem.fileReference.id.toString()}' could not be found.`
                )
            );
        }

        if (file.expiresAt.isExpired()) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot accept this RequestItem since the File with the given ID '${requestItem.fileReference.id.toString()}' is already expired.`
                )
            );
        }

        if (file.isOwn) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot accept this RequestItem since the File with the given fileReference '${requestItem.fileReference.id.toString()}' is already owned by you.`
                )
            );
        }

        if (file.owner.toString() !== requestInfo.peer.toString()) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot accept this RequestItem since the File with the given fileReference '${requestItem.fileReference.id.toString()}' is not owned by the peer.`
                )
            );
        }

        if (file.tags && file.tags.length > 0) {
            const tagValidationResult = await this.consumptionController.attributes.validateTagsForType(file.tags, "IdentityFileReference");
            if (tagValidationResult.isError()) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `You cannot accept this RequestItem since the File with the given fileReference '${requestItem.fileReference.id.toString()}' has invalid tags. ${tagValidationResult.error.message}`
                    )
                );
            }
        }

        const validationResult = await this.accountController.files.validateFileOwnershipToken(file.id, requestItem.ownershipToken);
        if (!validationResult.isValid) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot accept this RequestItem since the specified ownershipToken is not valid for the File with ID '${requestItem.fileReference.id.toString()}'.`
                )
            );
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: TransferFileOwnershipRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<TransferFileOwnershipAcceptResponseItem> {
        const peerFile = await this.accountController.files.getOrLoadFileByReference(requestItem.fileReference);

        const ownFile = await this.accountController.files.claimFileOwnership(peerFile.id, requestItem.ownershipToken);

        const ownIdentityAttribute = await this.consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: IdentityFileReference.from({
                    value: ownFile.toFileReference(this.accountController.config.baseUrl).truncate()
                }),
                owner: this.accountController.identity.address,
                tags: ownFile.tags
            })
        });

        await this.consumptionController.attributes.addSharingInfoToOwnIdentityAttribute(ownIdentityAttribute, requestInfo.peer, requestInfo.id);

        return TransferFileOwnershipAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: ownIdentityAttribute.id,
            attribute: ownIdentityAttribute.content
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: TransferFileOwnershipAcceptResponseItem | RejectResponseItem,
        _requestItem: TransferFileOwnershipRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof TransferFileOwnershipAcceptResponseItem)) {
            return;
        }

        await this.consumptionController.attributes.createPeerIdentityAttribute({
            id: responseItem.attributeId,
            content: responseItem.attribute,
            peer: requestInfo.peer,
            sourceReference: requestInfo.id
        });
    }
}
