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
import { nameof } from "ts-simple-nameof";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { LocalAttribute } from "../../../attributes/local/LocalAttribute";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import validateAttributeMatchesWithQuery from "../utility/validateAttributeMatchesWithQuery";
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

        const proposedAttributeMatchesWithQueryValidationResult = validateAttributeMatchesWithQuery(
            requestItem.query,
            requestItem.attribute,
            CoreAddress.from(""),
            this.currentIdentityAddress
        );
        if (proposedAttributeMatchesWithQueryValidationResult.isError()) {
            return proposedAttributeMatchesWithQueryValidationResult;
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
        requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);
        let attribute;

        if (parsedParams.isWithExistingAttribute()) {
            if (requestItem.query instanceof RelationshipAttributeQuery) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidAcceptParameters("When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided.")
                );
            }

            const foundLocalAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);

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

                const ownSharedIdentityAttributeSuccessors = await this.consumptionController.attributes.getSharedSuccessorsOfRepositoryAttribute(foundLocalAttribute, {
                    "shareInfo.peer": requestInfo.peer.toString()
                });

                if (ownSharedIdentityAttributeSuccessors.length > 0) {
                    return ValidationResult.error(
                        CoreErrors.requests.attributeQueryMismatch(
                            `The provided IdentityAttribute is outdated. You have already shared the successor '${ownSharedIdentityAttributeSuccessors[0].shareInfo?.sourceAttribute}' of it.`
                        )
                    );
                }
            }
        } else if (parsedParams.isWithNewAttribute()) {
            attribute = parsedParams.attribute;

            const ownerIsEmpty = attribute.owner.equals("");
            if (ownerIsEmpty) {
                attribute.owner = this.currentIdentityAddress;
            }
        }

        if (typeof attribute === "undefined") {
            return ValidationResult.error(
                CoreErrors.requests.invalidAcceptParameters(
                    `You have to specify either ${nameof<AcceptProposeAttributeRequestItemParameters>(
                        (x) => x.attribute
                    )} or ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
                )
            );
        }

        const answerToQueryValidationResult = validateAttributeMatchesWithQuery(requestItem.query, attribute, this.currentIdentityAddress, requestInfo.peer);
        if (answerToQueryValidationResult.isError()) return answerToQueryValidationResult;

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ProposeAttributeAcceptResponseItem> {
        const parsedParams = AcceptProposeAttributeRequestItemParameters.from(params);
        let sharedLocalAttribute;

        if (parsedParams.isWithExistingAttribute()) {
            sharedLocalAttribute = await this.copyExistingAttribute(parsedParams.attributeId, requestInfo);
        } else if (parsedParams.isWithNewAttribute()) {
            if (parsedParams.attribute.owner.equals("")) {
                parsedParams.attribute.owner = this.currentIdentityAddress;
            }
            sharedLocalAttribute = await this.createNewAttribute(parsedParams.attribute, requestInfo);
        }

        if (typeof sharedLocalAttribute === "undefined") {
            throw new Error(
                `You have to specify either ${nameof<AcceptProposeAttributeRequestItemParameters>(
                    (x) => x.attribute
                )} or ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
            );
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
