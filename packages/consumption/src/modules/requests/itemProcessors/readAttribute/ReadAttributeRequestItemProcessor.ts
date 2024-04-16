import {
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
import { AttributeSuccessorParams, LocalAttributeShareInfo, PeerSharedAttributeSucceededEvent } from "../../../attributes";
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

            if (typeof foundAttribute === "undefined") {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            const ownerIsCurrentIdentity = this.accountController.identity.isMe(foundAttribute.content.owner);
            if (!ownerIsCurrentIdentity && foundAttribute.content instanceof IdentityAttribute) {
                return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The given Attribute belongs to someone else. You can only share own Attributes."));
            }

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                parsedParams.existingAttributeId,
                [requestInfo.peer],
                true
            );
            if (latestSharedVersion.length > 0) {
                if (typeof latestSharedVersion[0].shareInfo?.sourceAttribute === "undefined") {
                    throw new Error(
                        `The Attribute ${latestSharedVersion[0].id} doesn't have a 'shareInfo.sourceAttribute', even though it was found as shared version of an Attribute.`
                    );
                }

                const latestSharedVersionSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(latestSharedVersion[0].shareInfo.sourceAttribute);
                if (typeof latestSharedVersionSourceAttribute === "undefined") {
                    throw new Error(`The Attribute ${latestSharedVersion[0].shareInfo.sourceAttribute} was not found.`);
                }

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
    ): Promise<ReadAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);

        let sharedLocalAttribute: LocalAttribute;
        if (parsedParams.isWithExistingAttribute()) {
            const existingSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);
            if (typeof existingSourceAttribute === "undefined") {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString());
            }

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                parsedParams.existingAttributeId,
                [requestInfo.peer],
                true
            );

            if (latestSharedVersion.length === 0) {
                sharedLocalAttribute = await this.copyExistingAttribute(existingSourceAttribute.id, requestInfo);
                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: sharedLocalAttribute.id,
                    attribute: sharedLocalAttribute.content
                });
            }

            const latestSharedAttribute = latestSharedVersion[0];
            if (typeof latestSharedAttribute.shareInfo?.sourceAttribute === "undefined") {
                throw new Error(
                    `The Attribute ${latestSharedAttribute.id} doesn't have a 'shareInfo.sourceAttribute', even though it was found as shared version of an Attribute.`
                );
            }

            if (latestSharedAttribute.shareInfo.sourceAttribute.toString() === existingSourceAttribute.id.toString()) {
                // return new AttributeAlreadySharedResponseItem
            }

            const predecessorSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(latestSharedAttribute.shareInfo.sourceAttribute);
            if (typeof predecessorSourceAttribute === "undefined") {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, latestSharedAttribute.shareInfo.sourceAttribute.toString());
            }

            if (await this.consumptionController.attributes.isSubsequentInSuccession(predecessorSourceAttribute, existingSourceAttribute)) {
                let successorSharedAttribute: LocalAttribute;
                if (existingSourceAttribute.isRepositoryAttribute(this.currentIdentityAddress)) {
                    successorSharedAttribute = await this.performOwnSharedIdentityAttributeSuccession(latestSharedAttribute.id, existingSourceAttribute, requestInfo);
                } else if (existingSourceAttribute.isOwnedBy(this.accountController.identity.address)) {
                    successorSharedAttribute = await this.performOwnSharedThirdPartyRelationshipAttributeSuccession(latestSharedAttribute.id, existingSourceAttribute, requestInfo);
                } else {
                    successorSharedAttribute = await this.performThirdPartyOwnedRelationshipAttributeSuccession(latestSharedAttribute.id, existingSourceAttribute, requestInfo);
                }

                return AttributeSuccessionAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    successorId: successorSharedAttribute.id,
                    successorContent: successorSharedAttribute.content,
                    predecessorId: latestSharedAttribute.id
                });
            }
        }
        sharedLocalAttribute = await this.createNewAttribute(parsedParams.newAttribute!, requestInfo);
        return ReadAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: sharedLocalAttribute.id,
            attribute: sharedLocalAttribute.content
        });
    }

    private async copyExistingAttribute(attributeId: CoreId, requestInfo: LocalRequestInfo) {
        return await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            sourceAttributeId: CoreId.from(attributeId),
            peer: CoreAddress.from(requestInfo.peer),
            requestReference: CoreId.from(requestInfo.id)
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
        responseItem: ReadAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | RejectResponseItem,
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
