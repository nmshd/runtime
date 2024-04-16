import {
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
import { AttributeSuccessorParams, LocalAttributeShareInfo, PeerSharedAttributeSucceededEvent } from "../../../attributes";
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

            if (typeof foundAttribute === "undefined") {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(parsedParams.attributeId, [requestInfo.peer], true);
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
    ): Promise<ProposeAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);

        let sharedLocalAttribute: LocalAttribute;
        if (parsedParams.isWithExistingAttribute()) {
            const existingSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);
            if (typeof existingSourceAttribute === "undefined") {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString());
            }

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(parsedParams.attributeId, [requestInfo.peer], true);

            if (latestSharedVersion.length === 0) {
                sharedLocalAttribute = await this.copyExistingAttribute(existingSourceAttribute.id, requestInfo);
                return ProposeAttributeAcceptResponseItem.from({
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
                if (existingSourceAttribute.isRepositoryAttribute(this.currentIdentityAddress)) {
                    const successorSharedAttribute = await this.performOwnSharedIdentityAttributeSuccession(latestSharedAttribute.id, existingSourceAttribute, requestInfo);
                    return AttributeSuccessionAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        successorId: successorSharedAttribute.id,
                        successorContent: successorSharedAttribute.content,
                        predecessorId: latestSharedAttribute.id
                    });
                }
            }
        }
        sharedLocalAttribute = await this.createNewAttribute(parsedParams.attribute!, requestInfo);

        return ProposeAttributeAcceptResponseItem.from({
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
        responseItem: ProposeAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | RejectResponseItem,
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
