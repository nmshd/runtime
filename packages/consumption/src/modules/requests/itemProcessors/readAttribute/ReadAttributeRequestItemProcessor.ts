import {
    IdentityAttribute,
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

        if (parsedParams.isWithExistingAttribute()) {
            const foundAttribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.existingAttributeId);

            if (!foundAttribute) {
                return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString()));
            }

            const ownerIsCurrentIdentity = this.accountController.identity.isMe(foundAttribute.content.owner);
            if (!ownerIsCurrentIdentity && foundAttribute.content instanceof IdentityAttribute) {
                return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The given Attribute belongs to someone else. You can only share own Attributes."));
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
