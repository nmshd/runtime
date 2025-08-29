import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    IdentityAttribute,
    IdentityAttributeQuery,
    IQLQuery,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request,
    ResponseItemResult,
    ThirdPartyRelationshipAttributeQuery
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { RelationshipStatus, TransportCoreErrors } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    AttributeSucceededEvent,
    OwnIdentityAttribute,
    OwnIdentityAttributeSuccessorParams,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerIdentityAttributeSharingInfo,
    PeerIdentityAttributeSuccessorParams,
    PeerRelationshipAttribute,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSuccessorParams
} from "../../../attributes";
import { LocalAttribute } from "../../../attributes/local/attributeTypes";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import createAppropriateResponseItem from "../utility/createAppropriateResponseItem";
import validateAttributeMatchesWithQuery from "../utility/validateAttributeMatchesWithQuery";
import validateQuery from "../utility/validateQuery";
import { AcceptReadAttributeRequestItemParameters, AcceptReadAttributeRequestItemParametersJSON } from "./AcceptReadAttributeRequestItemParameters";

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<ReadAttributeRequestItem, AcceptReadAttributeRequestItemParametersJSON> {
    public override async canCreateOutgoingRequestItem(requestItem: ReadAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const queryValidationResult = await this.validateQuery(requestItem, recipient);
        if (queryValidationResult.isError()) {
            return queryValidationResult;
        }

        if (requestItem.query instanceof RelationshipAttributeQuery && recipient) {
            const ownerIsEmptyString = requestItem.query.owner.toString() === "";
            const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                requestItem.query.key,
                ownerIsEmptyString ? recipient : requestItem.query.owner,
                requestItem.query.attributeCreationHints.valueType,
                recipient
            );

            if (relationshipAttributesWithSameKey.length !== 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The creation of the queried RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.query.key}', owner and value type.`
                    )
                );
            }
        }

        return ValidationResult.success();
    }

    private async validateQuery(requestItem: ReadAttributeRequestItem, recipient?: CoreAddress) {
        const commonQueryValidationResult = validateQuery(requestItem.query, this.currentIdentityAddress, recipient);
        if (commonQueryValidationResult.isError()) {
            return commonQueryValidationResult;
        }

        if (requestItem.query instanceof RelationshipAttributeQuery) {
            const senderIsAttributeOwner = requestItem.query.owner.equals(this.currentIdentityAddress);
            const ownerIsEmptyString = requestItem.query.owner.toString() === "";

            if (!(senderIsAttributeOwner || ownerIsEmptyString)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "The owner of the given `query` can only be an empty string or yourself. This is because you can only request RelationshipAttributes using a ReadAttributeRequestitem with a RelationshipAttributeQuery where the Recipient of the Request or yourself is the owner. And in order to avoid mistakes, the Recipient automatically will become the owner of the RelationshipAttribute later on if the owner of the `query` is an empty string."
                    )
                );
            }
        }

        const tagValidationResult = await this.consumptionController.attributes.validateAttributeQueryTags(requestItem.query);
        if (tagValidationResult.isError()) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);
        let attribute;

        if (parsedParams.isWithExistingAttribute()) {
            if (requestItem.query instanceof RelationshipAttributeQuery) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters("When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided.")
                );
            }

            const foundLocalAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);

            if (!foundLocalAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString()));
            }

            if (
                !(
                    foundLocalAttribute instanceof OwnIdentityAttribute ||
                    foundLocalAttribute instanceof OwnRelationshipAttribute ||
                    foundLocalAttribute instanceof PeerRelationshipAttribute
                )
            ) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        "The selected Attribute is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute. When accepting a ReadAttributeRequestItem with an existing Attribute it may only be such an Attribute."
                    )
                );
            }

            attribute = foundLocalAttribute.content;

            if ((requestItem.query instanceof IdentityAttributeQuery || requestItem.query instanceof IQLQuery) && foundLocalAttribute instanceof OwnIdentityAttribute) {
                const successorsSharedWithPeer = await this.consumptionController.attributes.getSuccessorsOfAttributeSharedWithPeer(foundLocalAttribute, requestInfo.peer, true);

                if (successorsSharedWithPeer.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.attributeQueryMismatch(
                            `The provided IdentityAttribute is outdated. You have already shared the successor '${successorsSharedWithPeer[0].id}' of it.`
                        )
                    );
                }

                if (parsedParams.tags && parsedParams.tags.length > 0) {
                    attribute = attribute as IdentityAttribute;
                    attribute.tags = attribute.tags ? [...attribute.tags, ...parsedParams.tags] : parsedParams.tags;
                }
            }

            if (
                requestItem.query instanceof ThirdPartyRelationshipAttributeQuery &&
                (foundLocalAttribute instanceof OwnRelationshipAttribute || foundLocalAttribute instanceof PeerRelationshipAttribute)
            ) {
                const initialPeer = foundLocalAttribute.peerSharingInfo.peer.toString();
                const queriedThirdParties = requestItem.query.thirdParty.map((aThirdParty) => aThirdParty.toString());

                if (
                    (foundLocalAttribute instanceof OwnRelationshipAttribute || queriedThirdParties.includes(initialPeer)) &&
                    !queriedThirdParties.includes("") &&
                    !queriedThirdParties.includes(initialPeer)
                ) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.attributeQueryMismatch(
                            "The provided RelationshipAttribute exists in the context of a Relationship with a third party that should not be involved."
                        )
                    );
                }

                const queryForNonPendingRelationships = {
                    "peer.address": initialPeer,
                    status: { $in: [RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed] }
                };

                const nonPendingRelationshipsToPeer = await this.accountController.relationships.getRelationships(queryForNonPendingRelationships);

                if (nonPendingRelationshipsToPeer.length === 0) {
                    return ValidationResult.error(ConsumptionCoreErrors.requests.cannotShareRelationshipAttributeOfPendingRelationship());
                }

                if (parsedParams.tags && parsedParams.tags.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidAcceptParameters("When responding to a ThirdPartyRelationshipAttributeQuery, no tags may be specified.")
                    );
                }
            }
        } else if (parsedParams.isWithNewAttribute()) {
            if (requestItem.query instanceof ThirdPartyRelationshipAttributeQuery) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        "When responding to a ThirdPartyRelationshipAttributeQuery, only RelationshipAttributes that already exist may be provided."
                    )
                );
            }

            attribute = parsedParams.newAttribute;

            const ownerIsEmptyString = attribute.owner.equals("");
            if (ownerIsEmptyString) {
                attribute.owner = this.currentIdentityAddress;
            }
        }

        if (attribute === undefined) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `You have to specify either ${nameof<AcceptReadAttributeRequestItemParameters>(
                        (x) => x.newAttribute
                    )} or ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.existingAttributeId)}.`
                )
            );
        }

        if (!this.consumptionController.attributes.validateAttributeCharacters(attribute)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The Attribute contains forbidden characters."));
        }

        const answerToQueryValidationResult = validateAttributeMatchesWithQuery(requestItem.query, attribute, this.currentIdentityAddress, requestInfo.peer);
        if (answerToQueryValidationResult.isError()) return answerToQueryValidationResult;

        if (requestItem.query instanceof RelationshipAttributeQuery) {
            const ownerOfQueriedAttributeIsEmptyString = requestItem.query.owner.toString() === "";

            const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                requestItem.query.key,
                ownerOfQueriedAttributeIsEmptyString ? this.currentIdentityAddress : requestItem.query.owner,
                requestItem.query.attributeCreationHints.valueType,
                requestInfo.peer
            );

            if (relationshipAttributesWithSameKey.length !== 0) {
                if (requestItem.mustBeAccepted) {
                    throw ConsumptionCoreErrors.requests.violatedKeyUniquenessOfRelationshipAttributes(
                        `The queried RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.query.key}', owner and value type.`
                    );
                }

                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        `This ReadAttributeRequestItem cannot be accepted as the queried RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.query.key}', owner and value type.`
                    )
                );
            }
        }

        if (
            requestItem.query instanceof ThirdPartyRelationshipAttributeQuery &&
            attribute instanceof RelationshipAttribute &&
            attribute.confidentiality === RelationshipAttributeConfidentiality.Private
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.attributeQueryMismatch(
                    "The confidentiality of the provided RelationshipAttribute is private. Therefore you are not allowed to share it."
                )
            );
        }

        const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(attribute);
        if (tagValidationResult.isError()) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters(tagValidationResult.error.message));
        }

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ReadAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);

        if (parsedParams.isWithExistingAttribute()) {
            let existingAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);
            if (!existingAttribute) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString());
            }

            if (
                !(
                    existingAttribute instanceof OwnIdentityAttribute ||
                    existingAttribute instanceof OwnRelationshipAttribute ||
                    existingAttribute instanceof PeerRelationshipAttribute
                )
            ) {
                throw ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    "The selected Attribute is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute. When accepting a ReadAttributeRequestItem with an existing Attribute it may only be such an Attribute."
                );
            }

            if (parsedParams.tags && parsedParams.tags.length > 0 && existingAttribute instanceof OwnIdentityAttribute) {
                const mergedTags = existingAttribute.content.tags ? [...existingAttribute.content.tags, ...parsedParams.tags] : parsedParams.tags;

                const successorParams = OwnIdentityAttributeSuccessorParams.from({
                    content: {
                        ...existingAttribute.content.toJSON(),
                        tags: mergedTags
                    }
                });
                const attributesAfterSuccession = await this.consumptionController.attributes.succeedOwnIdentityAttribute(existingAttribute, successorParams);
                existingAttribute = attributesAfterSuccession.successor;

                if (!(existingAttribute instanceof OwnIdentityAttribute)) throw new Error("This should never occur, but is required for the compiler.");
            }

            const latestSharedVersion = await this.consumptionController.attributes.getVersionsOfAttributeSharedWithPeer(existingAttribute, requestInfo.peer);

            const isLatestSharedVersion = latestSharedVersion[0]?.id.equals(existingAttribute.id);
            if (isLatestSharedVersion) {
                if (latestSharedVersion[0].isToBeDeletedByForwardingPeer(requestInfo.peer)) {
                    await this.consumptionController.attributes.setForwardedDeletionInfoOfAttribute(latestSharedVersion[0], undefined, requestInfo.peer, true);
                }

                return AttributeAlreadySharedAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: latestSharedVersion[0].id
                });
            }

            const updatedAttribute = await this.consumptionController.attributes.addForwardedSharingInfoToAttribute(existingAttribute, requestInfo.peer, requestInfo.id);

            const wasNotSharedBefore = latestSharedVersion.length === 0;
            if (wasNotSharedBefore) {
                const thirdPartyAddress =
                    existingAttribute instanceof OwnRelationshipAttribute || existingAttribute instanceof PeerRelationshipAttribute
                        ? existingAttribute.peerSharingInfo.peer
                        : undefined;

                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: updatedAttribute.id,
                    attribute: updatedAttribute.content,
                    thirdPartyAddress
                });
            }

            const sharedPredecessor = latestSharedVersion[0];
            return AttributeSuccessionAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                predecessorId: sharedPredecessor.id,
                successorId: updatedAttribute.id,
                successorContent: updatedAttribute.content
            });
        } else if (parsedParams.isWithNewAttribute()) {
            if (parsedParams.newAttribute.owner.equals("")) {
                parsedParams.newAttribute.owner = this.currentIdentityAddress;
            }

            if (parsedParams.newAttribute instanceof RelationshipAttribute) {
                if (parsedParams.newAttribute.owner.toString() === this.currentIdentityAddress.toString()) {
                    const ownRelationshipAttribute = await this.consumptionController.attributes.createOwnRelationshipAttribute({
                        content: parsedParams.newAttribute,
                        peer: requestInfo.peer,
                        sourceReference: requestInfo.id
                    });

                    return ReadAttributeAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        attributeId: ownRelationshipAttribute.id,
                        attribute: ownRelationshipAttribute.content
                    });
                }

                const peerRelationshipAttribute = await this.consumptionController.attributes.createPeerRelationshipAttribute({
                    content: parsedParams.newAttribute,
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id
                });

                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: peerRelationshipAttribute.id,
                    attribute: peerRelationshipAttribute.content
                });
            }

            return await createAppropriateResponseItem(parsedParams.newAttribute, requestInfo, this.consumptionController.attributes, "Read");
        }

        throw new Error(
            `You have to specify either ${nameof<AcceptReadAttributeRequestItemParameters>(
                (x) => x.newAttribute
            )} or ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.existingAttributeId)}.`
        );
    }

    public override async applyIncomingResponseItem(
        responseItem: ReadAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
        _requestItem: ReadAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<AttributeSucceededEvent | void> {
        if (responseItem instanceof RejectResponseItem) return;

        if (responseItem instanceof AttributeAlreadySharedAcceptResponseItem) {
            const attribute = await this.consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            if (!attribute || !(attribute instanceof PeerIdentityAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) return;

            if (attribute.peerSharingInfo.deletionInfo?.deletionStatus !== ReceivedAttributeDeletionStatus.ToBeDeleted) return;

            // TODO: AttributesController function (shared for PeerIdentityAttribute and ThirdPartyRelationshipAttribute) -> other PR where deletionStatus is refactored
            attribute.peerSharingInfo.deletionInfo = undefined;
            await this.consumptionController.attributes.updateAttributeUnsafe(attribute);
            return;
        }

        if (responseItem instanceof AttributeSuccessionAcceptResponseItem) {
            const predecessor = await this.consumptionController.attributes.getLocalAttribute(responseItem.predecessorId);
            if (!predecessor) return;

            if (!(predecessor instanceof PeerIdentityAttribute || predecessor instanceof ThirdPartyRelationshipAttribute)) return;

            if (predecessor instanceof PeerIdentityAttribute && responseItem.successorContent instanceof IdentityAttribute) {
                const peerSharingInfo = PeerIdentityAttributeSharingInfo.from({
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id
                });
                const successorParams = PeerIdentityAttributeSuccessorParams.from({
                    id: responseItem.successorId,
                    content: responseItem.successorContent,
                    peerSharingInfo
                });

                const { predecessor: updatedPredecessor, successor } = await this.consumptionController.attributes.succeedPeerIdentityAttribute(predecessor, successorParams);
                return new AttributeSucceededEvent(this.currentIdentityAddress.toString(), updatedPredecessor, successor);
            }

            if (predecessor instanceof ThirdPartyRelationshipAttribute && responseItem.successorContent instanceof RelationshipAttribute) {
                const peerSharingInfo = ThirdPartyRelationshipAttributeSharingInfo.from({
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id,
                    initialAttributePeer: predecessor.peerSharingInfo.initialAttributePeer
                });
                const successorParams = ThirdPartyRelationshipAttributeSuccessorParams.from({
                    id: responseItem.successorId,
                    content: responseItem.successorContent,
                    peerSharingInfo
                });

                const { predecessor: updatedPredecessor, successor } = await this.consumptionController.attributes.succeedThirdPartyRelationshipAttribute(
                    predecessor,
                    successorParams
                );
                return new AttributeSucceededEvent(this.currentIdentityAddress.toString(), updatedPredecessor, successor);
            }
            return;
        }

        if (responseItem.attribute instanceof IdentityAttribute) {
            await this.consumptionController.attributes.createPeerIdentityAttribute({
                id: responseItem.attributeId,
                content: responseItem.attribute,
                peer: requestInfo.peer,
                sourceReference: requestInfo.id
            });
            return;
        }

        if (responseItem.thirdPartyAddress) {
            await this.consumptionController.attributes.createThirdPartyRelationshipAttribute({
                id: responseItem.attributeId,
                content: responseItem.attribute,
                peer: requestInfo.peer,
                sourceReference: requestInfo.id,
                initialAttributePeer: responseItem.thirdPartyAddress
            });
            return;
        }

        if (responseItem.attribute.owner.equals(this.currentIdentityAddress)) {
            await this.consumptionController.attributes.createOwnRelationshipAttribute({
                id: responseItem.attributeId,
                content: responseItem.attribute,
                peer: requestInfo.peer,
                sourceReference: requestInfo.id
            });
            return;
        }

        await this.consumptionController.attributes.createPeerRelationshipAttribute({
            id: responseItem.attributeId,
            content: responseItem.attribute,
            peer: requestInfo.peer,
            sourceReference: requestInfo.id
        });
    }
}
