import {
    IdentityAttribute,
    IdentityAttributeQuery,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreId, CoreErrors as TransportCoreErrors } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { LocalAttribute } from "../../../attributes/local/LocalAttribute";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import validateQuery from "../utility/validateQuery";
import { AcceptReadAttributeRequestItemParameters, AcceptReadAttributeRequestItemParametersJSON } from "./AcceptReadAttributeRequestItemParameters";

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<ReadAttributeRequestItem, AcceptReadAttributeRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: ReadAttributeRequestItem, _request: Request, recipient?: CoreAddress): ValidationResult {
        const queryValidationResult = validateQuery(requestItem.query, this.currentIdentityAddress, recipient);
        if (queryValidationResult.isError()) {
            return queryValidationResult;
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
        let existingOrNew;

        if (parsedParams.isWithExistingAttribute()) {
            const foundLocalAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);

            if (!foundLocalAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            attribute = foundLocalAttribute.content;
            existingOrNew = "existing";
        }

        if (parsedParams.isWithNewAttribute()) {
            attribute = parsedParams.newAttribute;
            existingOrNew = "new";
        }

        if (!attribute || !existingOrNew) {
            return ValidationResult.error(CoreErrors.requests.unexpectedErrorDuringRequestItemProcessing("An unknown error occurred during the RequestItem processing."));
        }

        const ownerIsCurrentIdentity = this.accountController.identity.isMe(attribute.owner);
        if (!ownerIsCurrentIdentity && attribute instanceof IdentityAttribute) {
            return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery(`The ${existingOrNew} Attribute belongs to someone else. You can only share own Attributes.`));
        }

        if (_requestItem.query instanceof IdentityAttributeQuery) {
            if (!(attribute instanceof IdentityAttribute)) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidlyAnsweredQuery(`The ${existingOrNew} Attribute is not an IdentityAttribute, but an IdentityAttribute was queried.`)
                );
            }

            if (_requestItem.query.valueType !== attribute.value.constructor.name) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidlyAnsweredQuery(`The ${existingOrNew} IdentityAttribute is not of the queried IdentityAttribute Value Type.`)
                );
            }
        }

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
