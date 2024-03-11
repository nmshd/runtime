import {
    IdentityAttribute,
    IdentityAttributeQuery,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
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
import validateAnswerToQuery from "../utility/validateAnswerToQuery";
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
                    "The owner of the given `query` can only be an empty string or yourself. This is because you can only request RelationshipAttributes using a ReadAttributeRequestitem with a RelationshipAttributeQuery where the Recipient of the Request or yourself is the owner. And in order to avoid mistakes, the Recipient automatically becomes the owner of the RelationshipAttribute later on if the owner of the `query` is an empty string."
                )
            );
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);
        let attribute;

        if (parsedParams.isWithExistingAttribute()) {
            if (_requestItem.query instanceof RelationshipAttributeQuery) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidlyAnsweredQuery("When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided.")
                );
            }

            const foundLocalAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);

            if (!foundLocalAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            attribute = foundLocalAttribute.content;

            if (
                _requestItem.query instanceof IdentityAttributeQuery &&
                attribute instanceof IdentityAttribute &&
                this.accountController.identity.isMe(attribute.owner) &&
                foundLocalAttribute.isShared()
            ) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidlyAnsweredQuery("The provided IdentityAttribute is already shared. You can only share unshared IdentityAttributes.")
                );
            }
            if (_requestItem.query instanceof ThirdPartyRelationshipAttributeQuery && attribute instanceof RelationshipAttribute) {
                if (!foundLocalAttribute.isShared()) {
                    throw new Error("this should never happen");
                }

                if (foundLocalAttribute.shareInfo.sourceAttribute !== undefined) {
                    return ValidationResult.error(
                        CoreErrors.requests.invalidlyAnsweredQuery(
                            "When responding to a ThirdPartyRelationshipAttributeQuery, only RelationshipAttributes that are not a copy of a sourceAttribute may be provided."
                        )
                    );
                }

                function convertCoreAddressToString(value: CoreAddress): string {
                    return value.toString();
                }
                const queriedThirdParties = _requestItem.query.thirdParty.map(convertCoreAddressToString);

                if (
                    (this.accountController.identity.isMe(attribute.owner) || queriedThirdParties.includes(attribute.owner.toString())) &&
                    !queriedThirdParties.includes("") &&
                    !queriedThirdParties.includes(foundLocalAttribute.shareInfo.peer.toString())
                ) {
                    return ValidationResult.error(
                        CoreErrors.requests.invalidlyAnsweredQuery(
                            "The provided RelationshipAttribute exists in the context of a Relationship with a third party that should not be involved."
                        )
                    );
                }
            }
        } else if (parsedParams.isWithNewAttribute()) {
            if (_requestItem.query instanceof ThirdPartyRelationshipAttributeQuery) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidlyAnsweredQuery(
                        "When responding to a ThirdPartyRelationshipAttributeQuery, only RelationshipAttributes that already exist may be provided."
                    )
                );
            }
            attribute = parsedParams.newAttribute;
        }

        if (!attribute) {
            throw new Error("this should never happen");
        }

        const answerToQueryValidationResult = validateAnswerToQuery(_requestItem.query, attribute, this.currentIdentityAddress, requestInfo.peer);
        if (answerToQueryValidationResult.isError()) return answerToQueryValidationResult;

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ReadAttributeAcceptResponseItem> {
        const parsedParams = AcceptReadAttributeRequestItemParameters.from(params);

        let sharedLocalAttribute: LocalAttribute;
        if (parsedParams.isWithExistingAttribute()) {
            sharedLocalAttribute = await this.copyExistingAttribute(parsedParams.existingAttributeId, requestInfo);
        } else {
            sharedLocalAttribute = await this.createNewAttribute(parsedParams.newAttribute!, requestInfo);
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
