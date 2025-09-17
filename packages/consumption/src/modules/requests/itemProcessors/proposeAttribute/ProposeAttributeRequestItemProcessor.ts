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
import { CoreAddress } from "@nmshd/core-types";
import { TransportCoreErrors } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    AttributeSucceededEvent,
    OwnIdentityAttribute,
    OwnIdentityAttributeSuccessorParams,
    PeerIdentityAttribute,
    PeerIdentityAttributeSuccessorParams,
    ReceivedAttributeDeletionStatus
} from "../../../attributes";
import { LocalAttribute } from "../../../attributes/local/attributeTypes";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import createAppropriateResponseItem from "../utility/createAppropriateResponseItem";
import validateAttributeMatchesWithQuery from "../utility/validateAttributeMatchesWithQuery";
import validateQuery from "../utility/validateQuery";
import { AcceptProposeAttributeRequestItemParameters, AcceptProposeAttributeRequestItemParametersJSON } from "./AcceptProposeAttributeRequestItemParameters";

export class ProposeAttributeRequestItemProcessor extends GenericRequestItemProcessor<ProposeAttributeRequestItem, AcceptProposeAttributeRequestItemParametersJSON> {
    public override async canCreateOutgoingRequestItem(requestItem: ProposeAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const queryValidationResult = await this.validateQuery(requestItem, recipient);
        if (queryValidationResult.isError()) {
            return queryValidationResult;
        }

        const attributeValidationResult = await this.validateAttribute(requestItem.attribute);
        if (attributeValidationResult.isError()) {
            return attributeValidationResult;
        }

        const proposedAttributeMatchesWithQueryValidationResult = validateAttributeMatchesWithQuery(
            requestItem.query,
            requestItem.attribute,
            CoreAddress.from(""),
            this.currentIdentityAddress
        );
        if (proposedAttributeMatchesWithQueryValidationResult.isError()) {
            return proposedAttributeMatchesWithQueryValidationResult;
        }

        if (requestItem.query instanceof RelationshipAttributeQuery && recipient) {
            const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                requestItem.query.key,
                recipient,
                requestItem.query.attributeCreationHints.valueType,
                recipient
            );

            if (relationshipAttributesWithSameKey.length !== 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The creation of the proposed RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.query.key}', owner and value type.`
                    )
                );
            }
        }

        return ValidationResult.success();
    }

    private async validateAttribute(attribute: IdentityAttribute | RelationshipAttribute) {
        if (attribute.owner.toString() !== "") {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The owner of the given `attribute` can only be an empty string. This is because you can only propose Attributes where the Recipient of the Request is the owner anyway. And in order to avoid mistakes, the owner will be automatically filled for you."
                )
            );
        }
        if (!this.consumptionController.attributes.validateAttributeCharacters(attribute)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The Attribute contains forbidden characters."));
        }

        const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(attribute);
        if (tagValidationResult.isError()) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
        }

        return ValidationResult.success();
    }

    private async validateQuery(requestItem: ProposeAttributeRequestItem, recipient?: CoreAddress) {
        const commonQueryValidationResult = validateQuery(requestItem.query, this.currentIdentityAddress, recipient);
        if (commonQueryValidationResult.isError()) {
            return commonQueryValidationResult;
        }

        if (requestItem.query instanceof RelationshipAttributeQuery && requestItem.query.owner.toString() !== "") {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The owner of the given `query` can only be an empty string. This is because you can only propose Attributes where the Recipient of the Request is the owner anyway. And in order to avoid mistakes, the owner will be automatically filled for you."
                )
            );
        }

        const tagValidationResult = await this.consumptionController.attributes.validateAttributeQueryTags(requestItem.query);
        if (tagValidationResult.isError()) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);
        let attribute;

        if (parsedParams.isWithExistingAttribute()) {
            if (requestItem.query instanceof RelationshipAttributeQuery) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters("When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided.")
                );
            }

            const foundLocalAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);

            if (!foundLocalAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString()));
            }

            if (!(foundLocalAttribute instanceof OwnIdentityAttribute)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        "The selected Attribute is not an OwnIdentityAttribute. When accepting a ProposeAttributeRequestItem with an existing Attribute it may only be an OwnIdentityAttribute."
                    )
                );
            }

            attribute = foundLocalAttribute.content;

            const successorsSharedWithPeer = await this.consumptionController.attributes.getSuccessorsOfAttributeSharedWithPeer(foundLocalAttribute, requestInfo.peer, true);

            if (successorsSharedWithPeer.length > 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.attributeQueryMismatch(
                        `The provided IdentityAttribute is outdated. You have already shared the successor '${successorsSharedWithPeer[0].id}' of it.`
                    )
                );
            }

            if (parsedParams.tags && parsedParams.tags.length > 0) {
                attribute.tags = attribute.tags ? [...attribute.tags, ...parsedParams.tags] : parsedParams.tags;
            }
        } else if (parsedParams.isWithNewAttribute()) {
            attribute = parsedParams.attribute;

            const ownerIsEmpty = attribute.owner.equals("");
            if (ownerIsEmpty) {
                attribute.owner = this.currentIdentityAddress;
            }
        }

        if (attribute === undefined) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `You have to specify either ${nameof<AcceptProposeAttributeRequestItemParameters>(
                        (x) => x.attribute
                    )} or ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
                )
            );
        }

        if (!this.consumptionController.attributes.validateAttributeCharacters(attribute)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The Attribute contains forbidden characters."));
        }

        const answerToQueryValidationResult = validateAttributeMatchesWithQuery(requestItem.query, attribute, this.currentIdentityAddress, requestInfo.peer);
        if (answerToQueryValidationResult.isError()) return answerToQueryValidationResult;

        if (requestItem.query instanceof RelationshipAttributeQuery) {
            const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                requestItem.query.key,
                this.currentIdentityAddress,
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
                        `This ProposeAttributeRequestItem cannot be accepted as the queried RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.query.key}', owner and value type.`
                    )
                );
            }
        }

        const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(attribute);
        if (tagValidationResult.isError()) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters(tagValidationResult.error.message));
        }

        return ValidationResult.success();
    }

    // TODO: maybe have shared code with ReadAttributeRequestItemProcessor -> different PR
    public override async accept(
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ProposeAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);

        if (parsedParams.isWithExistingAttribute()) {
            let existingAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);
            if (!existingAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString());

            if (!(existingAttribute instanceof OwnIdentityAttribute)) {
                throw ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    "The selected Attribute is not an OwnIdentityAttribute. When accepting a ProposeAttributeRequestItem with an existing Attribute it may only be an OwnIdentityAttribute."
                );
            }

            if (parsedParams.tags && parsedParams.tags.length > 0) {
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

            const isLatestSharedVersion = latestSharedVersion[0]?.id.toString() === existingAttribute.id.toString();
            if (isLatestSharedVersion) {
                if (latestSharedVersion[0].hasDeletionStatusUnequalDeletedByPeer(requestInfo.peer)) {
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
                return ProposeAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: updatedAttribute.id,
                    attribute: updatedAttribute.content
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
            if (parsedParams.attribute.owner.equals("")) {
                parsedParams.attribute.owner = this.currentIdentityAddress;
            }

            if (parsedParams.attribute instanceof RelationshipAttribute) {
                const ownRelationshipAttribute = await this.consumptionController.attributes.createOwnRelationshipAttribute({
                    content: parsedParams.attribute,
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id
                });

                return ProposeAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownRelationshipAttribute.id,
                    attribute: ownRelationshipAttribute.content
                });
            }

            return await createAppropriateResponseItem(parsedParams.attribute, requestInfo, this.consumptionController.attributes, "Propose");
        }

        throw new Error(
            `You have to specify either ${nameof<AcceptProposeAttributeRequestItemParameters>(
                (x) => x.attribute
            )} or ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
        );
    }

    public override async applyIncomingResponseItem(
        responseItem: ProposeAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
        _requestItem: ProposeAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<AttributeSucceededEvent | void> {
        if (responseItem instanceof RejectResponseItem) return;

        if (responseItem instanceof AttributeAlreadySharedAcceptResponseItem) {
            const attribute = await this.consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            if (!attribute || !(attribute instanceof PeerIdentityAttribute)) return;

            if (attribute.peerSharingInfo.deletionInfo?.deletionStatus !== ReceivedAttributeDeletionStatus.ToBeDeleted) return;

            await this.consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(attribute, undefined, true);
            return;
        }

        if (responseItem instanceof ProposeAttributeAcceptResponseItem) {
            if (responseItem.attribute instanceof IdentityAttribute) {
                await this.consumptionController.attributes.createPeerIdentityAttribute({
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
            return;
        }

        if (responseItem instanceof AttributeSuccessionAcceptResponseItem && responseItem.successorContent instanceof IdentityAttribute) {
            const predecessor = await this.consumptionController.attributes.getLocalAttribute(responseItem.predecessorId);
            if (!predecessor) return;

            if (!(predecessor instanceof PeerIdentityAttribute && responseItem.successorContent instanceof IdentityAttribute)) return;

            const successorParams = PeerIdentityAttributeSuccessorParams.from({
                id: responseItem.successorId,
                content: responseItem.successorContent,
                sourceReference: requestInfo.id
            });

            const { predecessor: updatedPredecessor, successor } = await this.consumptionController.attributes.succeedPeerIdentityAttribute(predecessor, successorParams);
            return new AttributeSucceededEvent(this.currentIdentityAddress.toString(), updatedPredecessor, successor);
        }
    }
}
