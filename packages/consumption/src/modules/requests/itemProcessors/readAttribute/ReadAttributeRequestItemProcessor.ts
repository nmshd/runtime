import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreId, CoreErrors as TransportCoreErrors } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { AttributeSuccessorParams, DeletionStatus, LocalAttributeShareInfo, PeerSharedAttributeSucceededEvent } from "../../../attributes";
import { LocalAttribute } from "../../../attributes/local/LocalAttribute";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import validateQuery from "../utility/validateQuery";
import { AcceptReadAttributeRequestItemParameters, AcceptReadAttributeRequestItemParametersJSON } from "./AcceptReadAttributeRequestItemParameters";

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<ReadAttributeRequestItem, AcceptReadAttributeRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: ReadAttributeRequestItem, _request: Request, recipient?: CoreAddress): ValidationResult {
        const queryValidationResult = validateQuery(requestItem.query, this.currentIdentityAddress, recipient);
        if (queryValidationResult.isError()) {
            return queryValidationResult;
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);

        if (parsedParams.isWithExistingAttribute()) {
            const foundAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);
            if (!foundAttribute) return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString()));

            const ownerIsCurrentIdentity = this.accountController.identity.isMe(foundAttribute.content.owner);
            if (!ownerIsCurrentIdentity && foundAttribute.content instanceof IdentityAttribute) {
                return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The given Attribute belongs to someone else. You can only share own Attributes."));
            }

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfAttribute(parsedParams.existingAttributeId, [requestInfo.peer], true);
            if (latestSharedVersion.length > 0) {
                if (!latestSharedVersion[0].shareInfo?.sourceAttribute) {
                    throw new Error(
                        `The Attribute ${latestSharedVersion[0].id} doesn't have a 'shareInfo.sourceAttribute', even though it was found as shared version of an Attribute.`
                    );
                }

                const latestSharedVersionSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(latestSharedVersion[0].shareInfo.sourceAttribute);
                if (!latestSharedVersionSourceAttribute) throw new Error(`The Attribute ${latestSharedVersion[0].shareInfo.sourceAttribute} was not found.`);

                if (await this.consumptionController.attributes.isSubsequentInSuccession(foundAttribute, latestSharedVersionSourceAttribute)) {
                    return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("You cannot share the predecessor of an already shared Attribute version."));
                }
            }
        }

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ReadAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);

        let sharedLocalAttribute: LocalAttribute;
        if (parsedParams.isWithExistingAttribute()) {
            const existingSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);
            if (!existingSourceAttribute) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString());
            }

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfAttribute(parsedParams.existingAttributeId, [requestInfo.peer], true);

            const wasSharedBefore = latestSharedVersion.length > 0;
            const wasDeletedByPeerOrOwner =
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === DeletionStatus.DeletedByPeer ||
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === DeletionStatus.DeletedByOwner ||
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === DeletionStatus.ToBeDeletedByPeer ||
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === DeletionStatus.ToBeDeleted;
            const isLatestSharedVersion = latestSharedVersion[0]?.shareInfo?.sourceAttribute?.toString() === existingSourceAttribute.id.toString();
            const predecessorWasSharedBefore = wasSharedBefore && !isLatestSharedVersion;

            if (!wasSharedBefore || wasDeletedByPeerOrOwner) {
                sharedLocalAttribute = await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: CoreId.from(existingSourceAttribute.id),
                    peer: CoreAddress.from(requestInfo.peer),
                    requestReference: CoreId.from(requestInfo.id)
                });
                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: sharedLocalAttribute.id,
                    attribute: sharedLocalAttribute.content
                });
            }

            if (isLatestSharedVersion) {
                return AttributeAlreadySharedAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: latestSharedVersion[0].id
                });
            }

            if (predecessorWasSharedBefore) {
                const sharedPredecessor = latestSharedVersion[0];
                if (!sharedPredecessor.shareInfo?.sourceAttribute) {
                    throw new Error(
                        `The Attribute ${sharedPredecessor.id} doesn't have a 'shareInfo.sourceAttribute', even though it was found as shared version of an Attribute.`
                    );
                }

                const predecessorSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(sharedPredecessor.shareInfo.sourceAttribute);
                if (!predecessorSourceAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, sharedPredecessor.shareInfo.sourceAttribute.toString());

                if (await this.consumptionController.attributes.isSubsequentInSuccession(predecessorSourceAttribute, existingSourceAttribute)) {
                    let successorSharedAttribute: LocalAttribute;
                    if (existingSourceAttribute.isRepositoryAttribute(this.currentIdentityAddress)) {
                        successorSharedAttribute = await this.performOwnSharedIdentityAttributeSuccession(sharedPredecessor.id, existingSourceAttribute, requestInfo);
                    } else if (existingSourceAttribute.isOwnedBy(this.accountController.identity.address)) {
                        successorSharedAttribute = await this.performOwnSharedThirdPartyRelationshipAttributeSuccession(sharedPredecessor.id, existingSourceAttribute, requestInfo);
                    } else {
                        successorSharedAttribute = await this.performThirdPartyOwnedRelationshipAttributeSuccession(sharedPredecessor.id, existingSourceAttribute, requestInfo);
                    }

                    return AttributeSuccessionAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        successorId: successorSharedAttribute.id,
                        successorContent: successorSharedAttribute.content,
                        predecessorId: sharedPredecessor.id
                    });
                }
            }
        }

        if (!parsedParams.newAttribute) {
            throw new Error("The ReadAttributeRequestItem wasn't answered with a new Attribute, but it wasn't handled as having been answered with an existing Attribute, either.");
        }

        sharedLocalAttribute = await this.createNewAttribute(parsedParams.newAttribute, requestInfo);
        return ReadAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: sharedLocalAttribute.id,
            attribute: sharedLocalAttribute.content
        });
    }

    private async performOwnSharedIdentityAttributeSuccession(sharedPredecessorId: CoreId, sourceSuccessor: LocalAttribute, requestInfo: LocalRequestInfo) {
        const successorParams = {
            content: sourceSuccessor.content,
            shareInfo: LocalAttributeShareInfo.from({
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                sourceAttribute: sourceSuccessor.id
            })
        };
        const { successor } = await this.consumptionController.attributes.succeedOwnSharedIdentityAttribute(sharedPredecessorId, successorParams);
        return successor;
    }

    private async performOwnSharedThirdPartyRelationshipAttributeSuccession(sharedPredecessorId: CoreId, sourceSuccessor: LocalAttribute, requestInfo: LocalRequestInfo) {
        const successorParams = {
            content: sourceSuccessor.content,
            shareInfo: LocalAttributeShareInfo.from({
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                sourceAttribute: sourceSuccessor.id
            })
        };
        const { successor } = await this.consumptionController.attributes.succeedOwnSharedRelationshipAttribute(sharedPredecessorId, successorParams);
        return successor;
    }

    private async performThirdPartyOwnedRelationshipAttributeSuccession(sharedPredecessorId: CoreId, sourceSuccessor: LocalAttribute, requestInfo: LocalRequestInfo) {
        const successorParams = {
            content: sourceSuccessor.content,
            shareInfo: LocalAttributeShareInfo.from({
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                sourceAttribute: sourceSuccessor.id
            })
        };
        const { successor } = await this.consumptionController.attributes.succeedThirdPartyOwnedRelationshipAttribute(sharedPredecessorId, successorParams);
        return successor;
    }

    private async createNewAttribute(attribute: IdentityAttribute | RelationshipAttribute, requestInfo: LocalRequestInfo) {
        if (attribute instanceof IdentityAttribute) {
            const repositoryLocalAttribute = await this.consumptionController.attributes.createLocalAttribute({
                content: attribute
            });

            return await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: CoreId.from(repositoryLocalAttribute.id),
                peer: CoreAddress.from(requestInfo.peer),
                requestReference: CoreId.from(requestInfo.id)
            });
        }

        return await this.consumptionController.attributes.createPeerLocalAttribute({
            content: attribute,
            peer: requestInfo.peer,
            requestReference: CoreId.from(requestInfo.id)
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: ReadAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
        _requestItem: ReadAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<PeerSharedAttributeSucceededEvent | void> {
        if (responseItem instanceof ReadAttributeAcceptResponseItem) {
            await this.consumptionController.attributes.createPeerLocalAttribute({
                id: responseItem.attributeId,
                content: responseItem.attribute,
                peer: requestInfo.peer,
                requestReference: requestInfo.id
            });
        }

        if (responseItem instanceof AttributeSuccessionAcceptResponseItem) {
            const successorParams = AttributeSuccessorParams.from({
                id: responseItem.successorId,
                content: responseItem.successorContent,
                shareInfo: LocalAttributeShareInfo.from({
                    peer: requestInfo.peer,
                    requestReference: requestInfo.id
                })
            });

            if (responseItem.successorContent instanceof IdentityAttribute) {
                const { predecessor, successor } = await this.consumptionController.attributes.succeedPeerSharedIdentityAttribute(responseItem.predecessorId, successorParams);
                return new PeerSharedAttributeSucceededEvent(this.currentIdentityAddress.toString(), predecessor, successor);
            } else if (responseItem.successorContent.owner === requestInfo.peer) {
                await this.consumptionController.attributes.succeedPeerSharedRelationshipAttribute(responseItem.predecessorId, successorParams);
            } else {
                await this.consumptionController.attributes.succeedThirdPartyOwnedRelationshipAttribute(responseItem.predecessorId, successorParams);
            }
        }

        return;
    }
}
