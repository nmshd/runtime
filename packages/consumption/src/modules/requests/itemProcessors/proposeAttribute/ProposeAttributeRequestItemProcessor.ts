import {
    IdentityAttribute,
    IdentityAttributeQuery,
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
import { LocalAttribute } from "../../../attributes/local/LocalAttribute";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import validateAnswerToQuery from "../utility/validateAnswerToQuery";
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
                    "The owner of the given `attribute` can only be an empty string. This is because you can only propose Attributes where the Recipient of the Request is the owner anyway. And in order to avoid mistakes, the owner will be automatically filled for you."
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
                    "The owner of the given `query` can only be an empty string. This is because you can only propose Attributes where the Recipient of the Request is the owner anyway. And in order to avoid mistakes, the owner will be automatically filled for you."
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
        const parsedParams: AcceptProposeAttributeRequestItemParameters = AcceptProposeAttributeRequestItemParameters.from(params);
        let attribute;

        if (parsedParams.isWithExistingAttribute()) {
            const foundLocalAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);

            if (!foundLocalAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            attribute = foundLocalAttribute.content;

            if (_requestItem.query instanceof IdentityAttributeQuery && attribute instanceof IdentityAttribute && this.accountController.identity.isMe(attribute.owner)) {
                if (foundLocalAttribute.isShared()) {
                    return ValidationResult.error(
                        CoreErrors.requests.invalidlyAnsweredQuery("The provided IdentityAttribute is already shared. You can only share unshared IdentityAttributes.")
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
                while (repositoryAttribute.succeededBy !== undefined && i < 1000) {
                    const successor = await this.consumptionController.attributes.getLocalAttribute(repositoryAttribute.succeededBy);
                    if (!successor) {
                        throw TransportCoreErrors.general.recordNotFound(LocalAttribute, repositoryAttribute.succeededBy.toString());
                    }
                    if (sourceAttributeIdsOfOwnSharedIdentityAttributeVersions.includes(successor.id.toString())) {
                        return ValidationResult.error(
                            CoreErrors.requests.invalidlyAnsweredQuery(
                                `The provided IdentityAttribute is outdated. You have already shared the Successor '${successor.id.toString()}' of it.`
                            )
                        );
                    }
                    repositoryAttribute = successor;
                    i++;
                }
            }
        } else if (parsedParams.isWithNewAttribute()) {
            attribute = parsedParams.attribute;
        }

        if (!attribute) {
            throw new Error("this should never happen");
        }

        const ownerIsEmpty = attribute.owner.equals("");
        if (ownerIsEmpty) {
            attribute.owner = this.currentIdentityAddress;
        }

        const answerToQueryValidationResult = validateAnswerToQuery(_requestItem.query, attribute, this.currentIdentityAddress, requestInfo.peer);
        if (answerToQueryValidationResult.isError()) return answerToQueryValidationResult;

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ProposeAttributeAcceptResponseItem> {
        const parsedParams: AcceptProposeAttributeRequestItemParameters = AcceptProposeAttributeRequestItemParameters.from(params);
        let sharedLocalAttribute;

        if (parsedParams.isWithExistingAttribute()) {
            sharedLocalAttribute = await this.copyExistingAttribute(parsedParams.attributeId, requestInfo);
        } else if (parsedParams.isWithNewAttribute()) {
            if (parsedParams.attribute.owner.equals("")) {
                parsedParams.attribute.owner = this.currentIdentityAddress;
            }
            sharedLocalAttribute = await this.createNewAttribute(parsedParams.attribute, requestInfo);
        }

        if (!sharedLocalAttribute) {
            throw new Error("this should never happen");
        }

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
        responseItem: ProposeAttributeAcceptResponseItem | RejectResponseItem,
        _requestItem: ProposeAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof ProposeAttributeAcceptResponseItem)) {
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
