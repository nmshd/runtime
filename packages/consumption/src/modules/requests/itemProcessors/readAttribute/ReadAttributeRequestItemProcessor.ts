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

            if (!foundAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            const ownerIsCurrentIdentity = this.accountController.identity.isMe(foundAttribute.content.owner);
            if (!ownerIsCurrentIdentity && foundAttribute.content instanceof IdentityAttribute) {
                return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The given Attribute belongs to someone else. You can only share own Attributes."));
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

            const predecessorOwnSharedAttribute = latestSharedVersion[0];
            if (typeof predecessorOwnSharedAttribute.shareInfo?.sourceAttribute === "undefined") {
                throw new Error(`The Attribute ${predecessorOwnSharedAttribute.id} does not fulfill the requirements of an own shared Attribute.`);
            }

            if (predecessorOwnSharedAttribute.shareInfo.sourceAttribute.toString() === existingSourceAttribute.id.toString()) {
                // return new AttributeAlreadySharedResponseItem
                throw new Error("NotImplementedError");
            }

            const predecessorSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(predecessorOwnSharedAttribute.shareInfo.sourceAttribute);
            if (typeof predecessorSourceAttribute === "undefined") {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString());
            }
            if (await this.consumptionController.attributes.isPredecessorOf(predecessorSourceAttribute, existingSourceAttribute)) {
                if (existingSourceAttribute.isIdentityAttribute()) {
                    const successorOwnSharedAttribute = await this.performOwnSharedIdentityAttributeSuccession(
                        predecessorOwnSharedAttribute.id,
                        existingSourceAttribute,
                        requestInfo
                    );
                    return AttributeSuccessionAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        successorId: successorOwnSharedAttribute.id,
                        successorContent: successorOwnSharedAttribute.content,
                        predecessorId: predecessorOwnSharedAttribute.id
                    });
                }
                if (existingSourceAttribute.isRelationshipAttribute()) {
                    if (existingSourceAttribute.isOwnedBy(this.accountController.identity.address)) {
                        const successorOwnSharedAttribute = await this.performOwnSharedThirdPartyRelationshipAttributeSuccession(
                            predecessorOwnSharedAttribute.id,
                            existingSourceAttribute,
                            requestInfo
                        );
                        return AttributeSuccessionAcceptResponseItem.from({
                            result: ResponseItemResult.Accepted,
                            successorId: successorOwnSharedAttribute.id,
                            successorContent: successorOwnSharedAttribute.content,
                            predecessorId: predecessorOwnSharedAttribute.id
                        });
                    }

                    const successorOwnSharedAttribute = await this.performThirdPartyOwnedRelationshipAttributeSuccession(
                        predecessorOwnSharedAttribute.id,
                        existingSourceAttribute,
                        requestInfo
                    );
                    return AttributeSuccessionAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        successorId: successorOwnSharedAttribute.id,
                        successorContent: successorOwnSharedAttribute.content,
                        predecessorId: predecessorOwnSharedAttribute.id
                    });
                }
            } else {
                throw new Error("You cannot share the predecessor of an already shared Attribute version.");
            }
        } else {
            sharedLocalAttribute = await this.createNewAttribute(parsedParams.newAttribute!, requestInfo);
            return ReadAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: sharedLocalAttribute.id,
                attribute: sharedLocalAttribute.content
            });
        }

        // this should never be reached
        throw new Error("The ReadAttributeRequestItem must be either answered with an existing or a new Attribute.");
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
            }
            await this.consumptionController.attributes.succeedThirdPartyOwnedRelationshipAttribute(responseItem.predecessorId, successorParams);
        }

        return;
    }
}
