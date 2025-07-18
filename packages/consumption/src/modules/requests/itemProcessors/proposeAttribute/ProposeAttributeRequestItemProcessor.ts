import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    IdentityAttribute,
    IdentityAttributeQuery,
    IQLQuery,
    ProposeAttributeAcceptResponseItem,
    ProposeAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeQuery,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { TransportCoreErrors } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AttributeSuccessorParams, IAttributeSuccessorParams, LocalAttributeDeletionStatus, LocalAttributeShareInfo, PeerSharedAttributeSucceededEvent } from "../../../attributes";
import { LocalAttribute } from "../../../attributes/local/LocalAttribute";
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

            attribute = foundLocalAttribute.content;

            if (
                (requestItem.query instanceof IdentityAttributeQuery || requestItem.query instanceof IQLQuery) &&
                attribute instanceof IdentityAttribute &&
                this.accountController.identity.isMe(attribute.owner)
            ) {
                // if (foundLocalAttribute.isShared()) {
                //     return ValidationResult.error(
                //         ConsumptionCoreErrors.requests.attributeQueryMismatch(
                //             "The provided IdentityAttribute is a shared copy of a RepositoryAttribute. You can only share RepositoryAttributes."
                //         )
                //     );
                // }

                const attributeSuccessorsSharedWithPeer = await this.consumptionController.attributes.getSharedSuccessorsOfAttribute(foundLocalAttribute, {
                    "sharingInfos.peer": requestInfo.peer.toString()
                });

                if (attributeSuccessorsSharedWithPeer.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.attributeQueryMismatch(
                            `The provided IdentityAttribute is outdated. You have already shared the successor '${attributeSuccessorsSharedWithPeer[0].id}' of it.`
                        )
                    );
                }

                if (parsedParams.tags && parsedParams.tags.length > 0) {
                    attribute.tags = attribute.tags ? [...attribute.tags, ...parsedParams.tags] : parsedParams.tags;
                }
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

    public override async accept(
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ProposeAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);
        let sharedLocalAttribute;

        if (parsedParams.isWithExistingAttribute()) {
            let existingSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);
            if (!existingSourceAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString());

            if (parsedParams.tags && parsedParams.tags.length > 0 && existingSourceAttribute.content instanceof IdentityAttribute) {
                const mergedTags = existingSourceAttribute.content.tags ? [...existingSourceAttribute.content.tags, ...parsedParams.tags] : parsedParams.tags;
                existingSourceAttribute.content.tags = mergedTags;

                const successorParams: IAttributeSuccessorParams = {
                    content: existingSourceAttribute.content
                };
                const attributesAfterSuccession = await this.consumptionController.attributes.succeedAttribute(parsedParams.attributeId, successorParams);
                existingSourceAttribute = attributesAfterSuccession.successor;
            }

            const query = {
                "deletionInfo.deletionStatus": {
                    $nin: [
                        LocalAttributeDeletionStatus.DeletedByPeer,
                        LocalAttributeDeletionStatus.DeletedByOwner,
                        LocalAttributeDeletionStatus.ToBeDeletedByPeer,
                        LocalAttributeDeletionStatus.ToBeDeleted
                    ]
                }
            };
            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfAttribute(parsedParams.attributeId, [requestInfo.peer], true, query);

            const wasSharedBefore = latestSharedVersion.length > 0;
            const isLatestSharedVersion = latestSharedVersion[0]?.id.toString() === existingSourceAttribute.id.toString();
            const predecessorWasSharedBefore = wasSharedBefore && !isLatestSharedVersion;

            if (!wasSharedBefore) {
                sharedLocalAttribute = await this.consumptionController.attributes.createSharingInfoForAttribute({
                    attributeId: CoreId.from(existingSourceAttribute.id),
                    peer: CoreAddress.from(requestInfo.peer),
                    sourceReference: CoreId.from(requestInfo.id)
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

                // TODO: check why this check is necessary
                if (existingSourceAttribute.isOwnIdentityAttribute(this.currentIdentityAddress)) {
                    const successorParams = AttributeSuccessorParams.from({
                        content: existingSourceAttribute.content,
                        sharingInfo: LocalAttributeShareInfo.from({
                            peer: requestInfo.peer,
                            sourceReference: requestInfo.id,
                            sharedAt: CoreDate.utc()
                        })
                    });
                    const successorSharedAttribute = (await this.consumptionController.attributes.succeedAttribute(sharedPredecessor.id, successorParams)).successor;
                    return AttributeSuccessionAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        successorId: successorSharedAttribute.id,
                        successorContent: successorSharedAttribute.content,
                        predecessorId: sharedPredecessor.id
                    });
                }
            }
        } else if (parsedParams.isWithNewAttribute()) {
            if (parsedParams.attribute.owner.equals("")) {
                parsedParams.attribute.owner = this.currentIdentityAddress;
            }

            if (parsedParams.attribute instanceof RelationshipAttribute) {
                const sharingInfo = LocalAttributeShareInfo.from({
                    peer: requestInfo.peer,
                    sourceReference: CoreId.from(requestInfo.id),
                    sharedAt: CoreDate.utc()
                });
                const ownRelationshipAttribute = await this.consumptionController.attributes.createAttributeWithSharingInfo({
                    content: parsedParams.attribute,
                    sharingInfo
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
    ): Promise<PeerSharedAttributeSucceededEvent | void> {
        const sharingInfo = LocalAttributeShareInfo.from({
            peer: requestInfo.peer,
            sourceReference: requestInfo.id,
            sharedAt: CoreDate.utc()
        });

        if (responseItem instanceof ProposeAttributeAcceptResponseItem) {
            await this.consumptionController.attributes.createAttributeWithSharingInfo({
                id: responseItem.attributeId,
                content: responseItem.attribute,
                sharingInfo
            });
        }

        if (responseItem instanceof AttributeSuccessionAcceptResponseItem && responseItem.successorContent instanceof IdentityAttribute) {
            const successorParams = AttributeSuccessorParams.from({
                id: responseItem.successorId,
                content: responseItem.successorContent,
                sharingInfo
            });
            const { predecessor, successor } = await this.consumptionController.attributes.succeedAttribute(responseItem.predecessorId, successorParams);
            // TODO: check publishing of events
            return new PeerSharedAttributeSucceededEvent(this.currentIdentityAddress.toString(), predecessor, successor);
        }
        return;
    }
}
