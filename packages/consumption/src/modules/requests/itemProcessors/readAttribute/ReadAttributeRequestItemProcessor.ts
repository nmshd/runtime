import {
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
import { CoreErrors } from "../../../../consumption/CoreErrors";
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

            if (typeof foundLocalAttribute === "undefined") {
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

                const ownSharedIdentityAttributeVersions = await this.consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                    foundLocalAttribute.id,
                    [requestInfo.peer],
                    false
                );
                const sourceAttributeIdsOfOwnSharedIdentityAttributeVersions = ownSharedIdentityAttributeVersions.map((ownSharedIdentityAttribute) =>
                    ownSharedIdentityAttribute.shareInfo?.sourceAttribute?.toString()
                );

                let repositoryAttribute = foundLocalAttribute;
                let i = 0;
                while (typeof repositoryAttribute.succeededBy !== "undefined" && i < 1000) {
                    const successor = await this.consumptionController.attributes.getLocalAttribute(repositoryAttribute.succeededBy);
                    if (typeof successor === "undefined") {
                        throw TransportCoreErrors.general.recordNotFound(LocalAttribute, repositoryAttribute.succeededBy.toString());
                    }
                    if (sourceAttributeIdsOfOwnSharedIdentityAttributeVersions.includes(successor.id.toString())) {
                        return ValidationResult.error(
                            CoreErrors.requests.attributeQueryMismatch(
                                `The provided IdentityAttribute is outdated. You have already shared the successor '${successor.id.toString()}' of it.`
                            )
                        );
                    }
                    repositoryAttribute = successor;
                    i++;
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
            throw new Error("this should never happen");
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
    ): Promise<ReadAttributeAcceptResponseItem> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);
        let sharedLocalAttribute;

        if (parsedParams.isWithExistingAttribute()) {
            sharedLocalAttribute = await this.copyExistingAttribute(parsedParams.existingAttributeId, requestInfo);
        } else if (parsedParams.isWithNewAttribute()) {
            if (parsedParams.newAttribute.owner.equals("")) {
                parsedParams.newAttribute.owner = this.currentIdentityAddress;
            }
            sharedLocalAttribute = await this.createNewAttribute(parsedParams.newAttribute, requestInfo);
        }

        if (typeof sharedLocalAttribute === "undefined") {
            throw new Error("this should never happen");
        }

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
        responseItem: ReadAttributeAcceptResponseItem | RejectResponseItem,
        _requestItem: ReadAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof ReadAttributeAcceptResponseItem)) {
            return;
        }

        await this.consumptionController.attributes.createPeerLocalAttribute({
            id: responseItem.attributeId,
            content: responseItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });
    }
}
