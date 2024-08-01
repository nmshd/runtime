import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    IdentityAttribute,
    ProposeAttributeAcceptResponseItem,
    ProposeAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeQuery,
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
import { AcceptProposeAttributeRequestItemParameters, AcceptProposeAttributeRequestItemParametersJSON } from "./AcceptProposeAttributeRequestItemParameters";

export class ProposeAttributeRequestItemProcessor extends GenericRequestItemProcessor<ProposeAttributeRequestItem, AcceptProposeAttributeRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: ProposeAttributeRequestItem, _request: Request, recipient?: CoreAddress): ValidationResult {
        const queryValidationResult = this.validateQuery(requestItem, recipient);
        if (queryValidationResult.isError()) {
            return queryValidationResult;
        }

        const attributeValidationResult = this.validateAttribute(requestItem.attribute);
        if (attributeValidationResult.isError()) {
            return attributeValidationResult;
        }

        return ValidationResult.success();
    }

    private validateAttribute(attribute: IdentityAttribute | RelationshipAttribute) {
        if (attribute.owner.toString() !== "") {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    "The owner of the given `attribute` can only be an empty string. This is because you can only propose Attributes where the recipient of the Request is the owner anyway. And in order to avoid mistakes, the owner will be automatically filled for you."
                )
            );
        }

        return ValidationResult.success();
    }

    private validateQuery(requestItem: ProposeAttributeRequestItem, recipient?: CoreAddress) {
        const commonQueryValidationResult = validateQuery(requestItem.query, this.currentIdentityAddress, recipient);
        if (commonQueryValidationResult.isError()) {
            return commonQueryValidationResult;
        }

        if (requestItem.query instanceof RelationshipAttributeQuery && requestItem.query.owner.toString() !== "") {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    "The owner of the given `query` can only be an empty string. This is because you can only propose Attributes where the recipient of the Request is the owner anyway. And in order to avoid mistakes, the owner will be automatically filled for you."
                )
            );
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);

        let attribute = parsedParams.attribute;

        if (parsedParams.isWithExistingAttribute()) {
            const foundAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);

            if (!foundAttribute) return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString()));

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfAttribute(parsedParams.attributeId, [requestInfo.peer], true);
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

            attribute = foundAttribute.content;
        }

        const ownerIsEmpty = attribute!.owner.equals("");
        const ownerIsCurrentIdentity = attribute!.owner.equals(this.currentIdentityAddress);
        if (!ownerIsEmpty && !ownerIsCurrentIdentity) {
            return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The given Attribute belongs to someone else. You can only share own Attributes."));
        }

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ProposeAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);

        let sharedLocalAttribute: LocalAttribute;
        if (parsedParams.isWithExistingAttribute()) {
            const existingSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);
            if (!existingSourceAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString());

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfAttribute(parsedParams.attributeId, [requestInfo.peer], true);

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
                return ProposeAttributeAcceptResponseItem.from({
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
                    if (existingSourceAttribute.isRepositoryAttribute(this.currentIdentityAddress)) {
                        const successorSharedAttribute = await this.performOwnSharedIdentityAttributeSuccession(sharedPredecessor.id, existingSourceAttribute, requestInfo);
                        return AttributeSuccessionAcceptResponseItem.from({
                            result: ResponseItemResult.Accepted,
                            successorId: successorSharedAttribute.id,
                            successorContent: successorSharedAttribute.content,
                            predecessorId: sharedPredecessor.id
                        });
                    }
                }
            }
        }

        if (!parsedParams.attribute) {
            throw new Error(
                "The ProposeAttributeRequestItem wasn't answered with a new Attribute, but it wasn't handled as having been answered with an existing Attribute, either."
            );
        }

        sharedLocalAttribute = await this.createNewAttribute(parsedParams.attribute, requestInfo);

        return ProposeAttributeAcceptResponseItem.from({
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
        responseItem: ProposeAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
        _requestItem: ProposeAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<PeerSharedAttributeSucceededEvent | void> {
        if (responseItem instanceof ProposeAttributeAcceptResponseItem) {
            await this.consumptionController.attributes.createPeerLocalAttribute({
                id: responseItem.attributeId,
                content: responseItem.attribute,
                peer: requestInfo.peer,
                requestReference: requestInfo.id
            });
        }

        if (responseItem instanceof AttributeSuccessionAcceptResponseItem && responseItem.successorContent instanceof IdentityAttribute) {
            const successorParams = AttributeSuccessorParams.from({
                id: responseItem.successorId,
                content: responseItem.successorContent,
                shareInfo: LocalAttributeShareInfo.from({
                    peer: requestInfo.peer,
                    requestReference: requestInfo.id
                })
            });
            const { predecessor, successor } = await this.consumptionController.attributes.succeedPeerSharedIdentityAttribute(responseItem.predecessorId, successorParams);
            return new PeerSharedAttributeSucceededEvent(this.currentIdentityAddress.toString(), predecessor, successor);
        }
        return;
    }
}
