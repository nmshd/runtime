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
import { CoreAddress, CoreId, CoreErrors as TransportCoreErrors } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { AttributeSuccessorParams, LocalAttributeShareInfo, PeerSharedAttributeSucceededEvent } from "../../../attributes";
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
                CoreErrors.requests.invalidRequestItem(
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
                    CoreErrors.requests.invalidAcceptParameters("When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided.")
                );
            }

            const foundLocalAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);

            if (!foundLocalAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            attribute = foundLocalAttribute.content;

            if (requestItem.query instanceof IdentityAttributeQuery && attribute instanceof IdentityAttribute && this.accountController.identity.isMe(attribute.owner)) {
                if (foundLocalAttribute.isShared()) {
                    return ValidationResult.error(
                        CoreErrors.requests.attributeQueryMismatch(
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
                        CoreErrors.requests.attributeQueryMismatch(
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
                        CoreErrors.requests.attributeQueryMismatch(
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
                        CoreErrors.requests.attributeQueryMismatch(
                            "The provided RelationshipAttribute exists in the context of a Relationship with a third party that should not be involved."
                        )
                    );
                }
            }
        } else if (parsedParams.isWithNewAttribute()) {
            if (requestItem.query instanceof ThirdPartyRelationshipAttributeQuery) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidAcceptParameters(
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
                CoreErrors.requests.invalidAcceptParameters(
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
                CoreErrors.requests.attributeQueryMismatch("The confidentiality of the provided RelationshipAttribute is private. Therefore you are not allowed to share it.")
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

            if (latestSharedVersion.length === 0) {
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

            const latestSharedAttribute = latestSharedVersion[0];
            if (!latestSharedAttribute.shareInfo?.sourceAttribute) {
                throw new Error(
                    `The Attribute ${latestSharedAttribute.id} doesn't have a 'shareInfo.sourceAttribute', even though it was found as shared version of an Attribute.`
                );
            }

            if (latestSharedAttribute.shareInfo.sourceAttribute.toString() === existingSourceAttribute.id.toString()) {
                return AttributeAlreadySharedAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: latestSharedAttribute.id
                });
            }

            const predecessorSourceAttribute = await this.consumptionController.attributes.getLocalAttribute(latestSharedAttribute.shareInfo.sourceAttribute);
            if (!predecessorSourceAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, latestSharedAttribute.shareInfo.sourceAttribute.toString());

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
