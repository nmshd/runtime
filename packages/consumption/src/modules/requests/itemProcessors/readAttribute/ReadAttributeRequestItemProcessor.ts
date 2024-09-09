import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    IdentityAttribute,
    IdentityAttributeQuery,
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
import { AttributeSuccessorParams, LocalAttributeDeletionStatus, LocalAttributeShareInfo, PeerSharedAttributeSucceededEvent } from "../../../attributes";
import { LocalAttribute } from "../../../attributes/local/LocalAttribute";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import validateAttributeMatchesWithQuery from "../utility/validateAttributeMatchesWithQuery";
import validateQuery from "../utility/validateQuery";
import { AcceptReadAttributeRequestItemParameters, AcceptReadAttributeRequestItemParametersJSON } from "./AcceptReadAttributeRequestItemParameters";

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<ReadAttributeRequestItem, AcceptReadAttributeRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: ReadAttributeRequestItem, _request: Request, recipient?: CoreAddress): ValidationResult {
        const queryValidationResult = this.validateQuery(requestItem, recipient);
        if (queryValidationResult.isError()) {
            return queryValidationResult;
        }

        return ValidationResult.success();
    }

    private validateQuery(requestItem: ReadAttributeRequestItem, recipient?: CoreAddress) {
        const commonQueryValidationResult = validateQuery(requestItem.query, this.currentIdentityAddress, recipient);
        if (commonQueryValidationResult.isError()) {
            return commonQueryValidationResult;
        }

        if (requestItem.query instanceof RelationshipAttributeQuery && !["", this.currentIdentityAddress.toString()].includes(requestItem.query.owner.toString())) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The owner of the given `query` can only be an empty string or yourself. This is because you can only request RelationshipAttributes using a ReadAttributeRequestitem with a RelationshipAttributeQuery where the Recipient of the Request or yourself is the owner. And in order to avoid mistakes, the Recipient automatically will become the owner of the RelationshipAttribute later on if the owner of the `query` is an empty string."
                )
            );
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

            if (requestItem.query instanceof IdentityAttributeQuery && attribute instanceof IdentityAttribute && this.accountController.identity.isMe(attribute.owner)) {
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
            }

            if (requestItem.query instanceof ThirdPartyRelationshipAttributeQuery && attribute instanceof RelationshipAttribute) {
                if (!foundLocalAttribute.isShared()) {
                    throw new Error(
                        "The LocalAttribute found is faulty because its shareInfo is undefined, although its content is given by a RelationshipAttribute. Since RelationshipAttributes only make sense in the context of Relationships, they must always be shared."
                    );
                }

                if (typeof foundLocalAttribute.shareInfo.sourceAttribute !== "undefined") {
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

            const ownerIsEmpty = attribute.owner.equals("");
            if (ownerIsEmpty) {
                attribute.owner = this.currentIdentityAddress;
            }
        }

        if (typeof attribute === "undefined") {
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
            const existingSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);
            if (!existingSourceAttribute) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.existingAttributeId.toString());
            }

            const latestSharedVersion = await this.consumptionController.attributes.getSharedVersionsOfAttribute(parsedParams.existingAttributeId, [requestInfo.peer], true);

            const wasSharedBefore = latestSharedVersion.length > 0;
            const wasDeletedByPeerOrOwner =
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === LocalAttributeDeletionStatus.DeletedByPeer ||
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === LocalAttributeDeletionStatus.DeletedByOwner ||
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === LocalAttributeDeletionStatus.ToBeDeletedByPeer ||
                latestSharedVersion[0]?.deletionInfo?.deletionStatus === LocalAttributeDeletionStatus.ToBeDeleted;
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
        } else if (parsedParams.isWithNewAttribute()) {
            if (parsedParams.newAttribute.owner.equals("")) {
                parsedParams.newAttribute.owner = this.currentIdentityAddress;
            }
            sharedLocalAttribute = await this.createNewAttribute(parsedParams.newAttribute, requestInfo);
        }

        if (!sharedLocalAttribute) {
            throw new Error(
                `You have to specify either ${nameof<AcceptReadAttributeRequestItemParameters>(
                    (x) => x.newAttribute
                )} or ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.existingAttributeId)}.`
            );
        }

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
            const repositoryAttribute = await this.consumptionController.attributes.createRepositoryAttribute({
                content: attribute
            });

            return await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: CoreId.from(repositoryAttribute.id),
                peer: CoreAddress.from(requestInfo.peer),
                requestReference: CoreId.from(requestInfo.id)
            });
        }

        return await this.consumptionController.attributes.createSharedLocalAttribute({
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
            await this.consumptionController.attributes.createSharedLocalAttribute({
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
