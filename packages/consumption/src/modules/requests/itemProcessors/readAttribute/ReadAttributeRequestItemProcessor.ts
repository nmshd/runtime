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
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { RelationshipStatus, TransportCoreErrors } from "@nmshd/transport";
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
import { AcceptReadAttributeRequestItemParameters, AcceptReadAttributeRequestItemParametersJSON } from "./AcceptReadAttributeRequestItemParameters";

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<ReadAttributeRequestItem, AcceptReadAttributeRequestItemParametersJSON> {
    public override async canCreateOutgoingRequestItem(requestItem: ReadAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const queryValidationResult = this.validateQuery(requestItem, recipient);
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

    private validateQuery(requestItem: ReadAttributeRequestItem, recipient?: CoreAddress) {
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

            attribute = foundLocalAttribute.content;

            if (
                (requestItem.query instanceof IdentityAttributeQuery || requestItem.query instanceof IQLQuery) &&
                attribute instanceof IdentityAttribute &&
                this.accountController.identity.isMe(attribute.owner)
            ) {
                if (foundLocalAttribute.isShared()) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.attributeQueryMismatch(
                            "The provided IdentityAttribute is a shared copy of a RepositoryAttribute. You can only share RepositoryAttributes."
                        )
                    );
                }

                const ownSharedIdentityAttributeSuccessors = await this.consumptionController.attributes.getSharedSuccessorsOfAttribute(foundLocalAttribute, {
                    "shareInfo.peer": requestInfo.peer.toString()
                });

                if (ownSharedIdentityAttributeSuccessors.length > 0) {
                    if (!ownSharedIdentityAttributeSuccessors[0].shareInfo?.sourceAttribute) {
                        throw new Error(
                            `The LocalAttribute ${ownSharedIdentityAttributeSuccessors[0].id} does not have a 'shareInfo.sourceAttribute', even though it was found as a shared version of a LocalAttribute.`
                        );
                    }

                    const successorSourceRepositoryAttribute = await this.consumptionController.attributes.getLocalAttribute(
                        ownSharedIdentityAttributeSuccessors[0].shareInfo.sourceAttribute
                    );
                    if (!successorSourceRepositoryAttribute) {
                        throw new Error(`The RepositoryAttribute ${ownSharedIdentityAttributeSuccessors[0].shareInfo.sourceAttribute} was not found.`);
                    }

                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.attributeQueryMismatch(
                            `The provided IdentityAttribute is outdated. You have already shared the successor '${ownSharedIdentityAttributeSuccessors[0].shareInfo.sourceAttribute}' of it.`
                        )
                    );
                }

                if (parsedParams.tags && parsedParams.tags.length > 0) {
                    attribute.tags = attribute.tags ? [...attribute.tags, ...parsedParams.tags] : parsedParams.tags;
                }
            }

            if (requestItem.query instanceof ThirdPartyRelationshipAttributeQuery && attribute instanceof RelationshipAttribute) {
                if (!foundLocalAttribute.isShared()) {
                    throw new Error(
                        "The LocalAttribute found is faulty because its shareInfo is undefined, although its content is given by a RelationshipAttribute. Since RelationshipAttributes only make sense in the context of Relationships, they must always be shared."
                    );
                }

                if (foundLocalAttribute.shareInfo.sourceAttribute) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.attributeQueryMismatch(
                            "When responding to a ThirdPartyRelationshipAttributeQuery, only RelationshipAttributes that are not a copy of a sourceAttribute may be provided."
                        )
                    );
                }

                const queriedThirdParties = requestItem.query.thirdParty.map((aThirdParty) => aThirdParty.toString());

                if (
                    (this.accountController.identity.isMe(attribute.owner) || queriedThirdParties.includes(attribute.owner.toString())) &&
                    !queriedThirdParties.includes("") &&
                    !queriedThirdParties.includes(foundLocalAttribute.shareInfo.peer.toString())
                ) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.attributeQueryMismatch(
                            "The provided RelationshipAttribute exists in the context of a Relationship with a third party that should not be involved."
                        )
                    );
                }

                const queryForNonPendingRelationships = {
                    "peer.address": foundLocalAttribute.shareInfo.peer.address,
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

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ReadAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);
        let sharedLocalAttribute;

        if (parsedParams.isWithExistingAttribute()) {
            let existingSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);
            if (!existingSourceAttribute) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString());
            }

            if (parsedParams.tags && parsedParams.tags.length > 0 && existingSourceAttribute.content instanceof IdentityAttribute) {
                const mergedTags = existingSourceAttribute.content.tags ? [...existingSourceAttribute.content.tags, ...parsedParams.tags] : parsedParams.tags;
                existingSourceAttribute.content.tags = mergedTags;

                const successorParams: IAttributeSuccessorParams = {
                    content: existingSourceAttribute.content
                };
                const attributesAfterSuccession = await this.consumptionController.attributes.succeedRepositoryAttribute(parsedParams.existingAttributeId, successorParams);
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
            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfAttribute(parsedParams.existingAttributeId, [requestInfo.peer], true, query);

            const wasSharedBefore = latestSharedVersion.length > 0;
            const isLatestSharedVersion = latestSharedVersion[0]?.shareInfo?.sourceAttribute?.toString() === existingSourceAttribute.id.toString();
            const predecessorWasSharedBefore = wasSharedBefore && !isLatestSharedVersion;

            if (!wasSharedBefore) {
                sharedLocalAttribute = await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: CoreId.from(existingSourceAttribute.id),
                    peer: CoreAddress.from(requestInfo.peer),
                    requestReference: CoreId.from(requestInfo.id)
                });
                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: sharedLocalAttribute.id,
                    attribute: sharedLocalAttribute.content,
                    thirdPartyAddress: sharedLocalAttribute.shareInfo?.thirdPartyAddress
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

                let successorSharedAttribute: LocalAttribute;
                if (existingSourceAttribute.isRepositoryAttribute(this.currentIdentityAddress)) {
                    const successorParams = {
                        content: existingSourceAttribute.content,
                        shareInfo: LocalAttributeShareInfo.from({
                            peer: requestInfo.peer,
                            requestReference: requestInfo.id,
                            sourceAttribute: existingSourceAttribute.id
                        })
                    };
                    successorSharedAttribute = (await this.consumptionController.attributes.succeedOwnSharedIdentityAttribute(sharedPredecessor.id, successorParams)).successor;
                } else {
                    const successorParams = {
                        content: existingSourceAttribute.content,
                        shareInfo: LocalAttributeShareInfo.from({
                            peer: requestInfo.peer,
                            requestReference: requestInfo.id,
                            sourceAttribute: existingSourceAttribute.id,
                            thirdPartyAddress: sharedPredecessor.shareInfo.thirdPartyAddress
                        })
                    };
                    successorSharedAttribute = (await this.consumptionController.attributes.succeedThirdPartyRelationshipAttribute(sharedPredecessor.id, successorParams))
                        .successor;
                }

                return AttributeSuccessionAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    successorId: successorSharedAttribute.id,
                    successorContent: successorSharedAttribute.content,
                    predecessorId: sharedPredecessor.id
                });
            }
        } else if (parsedParams.isWithNewAttribute()) {
            if (parsedParams.newAttribute.owner.equals("")) {
                parsedParams.newAttribute.owner = this.currentIdentityAddress;
            }

            if (parsedParams.newAttribute instanceof RelationshipAttribute) {
                const ownSharedRelationshipAttribute = await this.consumptionController.attributes.createSharedLocalAttribute({
                    content: parsedParams.newAttribute,
                    peer: requestInfo.peer,
                    requestReference: CoreId.from(requestInfo.id)
                });

                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownSharedRelationshipAttribute.id,
                    attribute: ownSharedRelationshipAttribute.content
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
    ): Promise<PeerSharedAttributeSucceededEvent | void> {
        if (responseItem instanceof ReadAttributeAcceptResponseItem) {
            await this.consumptionController.attributes.createSharedLocalAttribute({
                id: responseItem.attributeId,
                content: responseItem.attribute,
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                thirdPartyAddress: responseItem.thirdPartyAddress
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

            const predecessor = await this.consumptionController.attributes.getLocalAttribute(responseItem.predecessorId);

            if (successorParams.shareInfo) {
                successorParams.shareInfo.thirdPartyAddress = predecessor?.shareInfo?.thirdPartyAddress;
            }

            if (responseItem.successorContent.owner === requestInfo.peer) {
                await this.consumptionController.attributes.succeedPeerSharedRelationshipAttribute(responseItem.predecessorId, successorParams);
            } else {
                await this.consumptionController.attributes.succeedThirdPartyRelationshipAttribute(responseItem.predecessorId, successorParams);
            }
        }

        return;
    }
}
