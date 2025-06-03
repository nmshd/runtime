import {
    AcceptResponseItem,
    IdentityAttribute,
    IdentityFileReference,
    RejectResponseItem,
    Request,
    ResponseItemResult,
    TransferFileOwnershipAcceptResponseItem,
    TransferFileOwnershipRequestItem
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
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

        if (foundFile.cache!.expiresAt.isExpired()) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `You cannot request the transfer of ownership of the File with ID '${requestItem.fileReference.id.toString()}' since it is already expired.`
                )
            );
        }

        if (requestItem.ownershipToken) {
            const validationResult = await this.accountController.files.validateFileOwnershipToken(foundFile.id, requestItem.ownershipToken);
            if (!validationResult.isValid) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The specified ownershipToken is not valid for the File with ID '${requestItem.fileReference.id.toString()}'.`
                    )
                );
            }
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
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `You cannot accept this RequestItem since the File with the given ID '${requestItem.fileReference.id.toString()}' could not be found.`
                )
            );
        }

        if (file.cache!.expiresAt.isExpired()) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `You cannot accept this RequestItem since the File with the given ID '${requestItem.fileReference.id.toString()}' is already expired.`
                )
            );
        }

        if (file.isOwn) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `You cannot accept this RequestItem since the File with the given fileReference '${requestItem.fileReference.id.toString()}' is already owned by you.`
                )
            );
        }

        if (file.cache!.owner.toString() !== requestInfo.peer.toString()) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `You cannot accept this RequestItem since the File with the given fileReference '${requestItem.fileReference.id.toString()}' is not owned by the peer.`
                )
            );
        }

        if (requestItem.ownershipToken) {
            const validationResult = await this.accountController.files.validateFileOwnershipToken(file.id, requestItem.ownershipToken);
            if (!validationResult.isValid) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `You cannot accept this RequestItem since the specified ownershipToken is not valid for the File with ID '${requestItem.fileReference.id.toString()}'.`
                    )
                );
            }
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: TransferFileOwnershipRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<TransferFileOwnershipAcceptResponseItem> {
        const peerFile = await this.accountController.files.getOrLoadFileByReference(requestItem.fileReference);

        let ownFile: File;
        if (requestItem.ownershipToken) {
            ownFile = await this.accountController.files.claimFileOwnership(peerFile.id, requestItem.ownershipToken);
        } else {
            const fileContent = await this.accountController.files.downloadFileContent(peerFile);
            ownFile = await this.accountController.files.sendFile({
                buffer: fileContent,
                title: peerFile.cache!.title,
                description: peerFile.cache!.description,
                filename: peerFile.cache!.filename,
                mimetype: peerFile.cache!.mimetype,
                expiresAt: CoreDate.from("9999-12-31T00:00:00.000Z"),
                tags: peerFile.cache!.tags
            });
        }

        const repositoryAttribute = await this.consumptionController.attributes.createRepositoryAttribute({
            content: IdentityAttribute.from({
                value: IdentityFileReference.from({
                    value: ownFile.toFileReference(this.accountController.config.baseUrl).truncate()
                }),
                owner: this.accountController.identity.address,
                tags: ownFile.cache!.tags
            })
        });

        const ownSharedIdentityAttribute = await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            sourceAttributeId: repositoryAttribute.id,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });

        return TransferFileOwnershipAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: ownSharedIdentityAttribute.id,
            attribute: ownSharedIdentityAttribute.content as IdentityAttribute
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: TransferFileOwnershipAcceptResponseItem | AcceptResponseItem | RejectResponseItem,
        requestItem: TransferFileOwnershipRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof TransferFileOwnershipAcceptResponseItem)) {
            return;
        }

        await this.consumptionController.attributes.createSharedLocalAttribute({
            id: responseItem.attributeId,
            content: responseItem.attribute,
            requestReference: requestInfo.id,
            peer: requestInfo.peer
        });

        if (!requestItem.ownershipToken) return;

        await this.accountController.files.updateCache([requestItem.fileReference.id.toString()]);
    }
}
