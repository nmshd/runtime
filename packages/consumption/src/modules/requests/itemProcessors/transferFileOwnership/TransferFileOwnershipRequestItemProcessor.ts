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
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class TransferFileOwnershipRequestItemProcessor extends GenericRequestItemProcessor<TransferFileOwnershipRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: TransferFileOwnershipRequestItem, _request: Request, _recipient?: CoreAddress): Promise<ValidationResult> {
        const foundFile = await this.accountController.files.getFile(CoreId.from(requestItem.fileReference.id));

        if (typeof foundFile === "undefined") {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The File with the given fileReference '${requestItem.fileReference.id.toString()}' could not be found.`)
            );
        }

        if (!foundFile.isOwn) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The File with the given fileReference '${requestItem.fileReference.id.toString()}' is not owned by you. You can request the transfer of ownership of Files that you own.`
                )
            );
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: TransferFileOwnershipRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const file = await this.accountController.files.getOrLoadFileByTruncated(requestItem.fileReference.truncate());

        // TODO: Do we want to throw errors in these cases?

        if (file.isOwn) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The File with the given fileReference '${requestItem.fileReference.id.toString()}' is already owned by you.`)
            );
        }

        if (file.cache!.owner !== requestInfo.peer) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The File with the given fileReference '${requestItem.fileReference.id.toString()}' is not owned by the peer.`)
            );
        }

        // TODO: what if file is expired? -> won't be found in the first place

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: TransferFileOwnershipRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<TransferFileOwnershipAcceptResponseItem | AcceptResponseItem> {
        const peerFile = await this.accountController.files.getOrLoadFileByTruncated(requestItem.fileReference.truncate());
        const fileContent = await this.accountController.files.downloadFileContent(peerFile);

        const ownFile = await this.accountController.files.sendFile({
            buffer: fileContent,
            title: peerFile.cache!.title,
            description: peerFile.cache!.description,
            filename: peerFile.cache!.filename,
            mimetype: peerFile.cache!.mimetype,
            expiresAt: CoreDate.from("9999-12-31T00:00:00.000Z"),
            tags: peerFile.cache!.tags
        });

        const repositoryAttribute = await this.consumptionController.attributes.createRepositoryAttribute({
            content: IdentityAttribute.from({
                value: IdentityFileReference.from({
                    value: ownFile.truncate()
                }),
                owner: this.accountController.identity.address,
                tags: peerFile.cache!.tags
            })
        });

        if (requestItem.denyAttributeCopy) {
            return AcceptResponseItem.from({
                result: ResponseItemResult.Accepted
            });
        }

        const ownSharedIdentityAttribute = await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            sourceAttributeId: repositoryAttribute.id,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });

        return TransferFileOwnershipAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: ownSharedIdentityAttribute.id,
            attribute: ownSharedIdentityAttribute.content
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: TransferFileOwnershipAcceptResponseItem | AcceptResponseItem | RejectResponseItem,
        _requestItem: TransferFileOwnershipRequestItem,
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
    }
}
