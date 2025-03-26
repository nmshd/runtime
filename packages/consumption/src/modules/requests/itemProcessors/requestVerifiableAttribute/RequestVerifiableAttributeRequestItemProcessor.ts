import {
    IdentityAttribute,
    RelationshipAttribute,
    Request,
    RequestVerifiableAttributeAcceptResponseItem,
    RequestVerifiableAttributeRequestItem,
    ResponseItemResult,
    SupportedVCTypes
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { getVCProcessor } from "../../../attributes/vc";
import { ValidationResult } from "../../../common";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import { AcceptVerifiableAttributeRequestItemParametersJSON } from "./AcceptVerifiableAttributeRequestItemParameters";

export class RequestVerifiableAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    RequestVerifiableAttributeRequestItem,
    AcceptVerifiableAttributeRequestItemParametersJSON
> {
    public override canCreateOutgoingRequestItem(requestItem: RequestVerifiableAttributeRequestItem, _request: Request, _recipient?: CoreAddress): ValidationResult {
        const attributeValidationResult = this.validateAttribute(requestItem.attribute);
        if (attributeValidationResult.isError()) {
            return attributeValidationResult;
        }

        return ValidationResult.success();
    }

    private validateAttribute(attribute: IdentityAttribute | RelationshipAttribute) {
        if (attribute.owner === this.currentIdentityAddress) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The owner has to be the requesting party."));
        }

        return ValidationResult.success();
    }

    public override canAccept(
        _requestItem: RequestVerifiableAttributeRequestItem,
        _params: AcceptVerifiableAttributeRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): ValidationResult {
        return ValidationResult.success();
    }

    public override async accept(
        requestItem: RequestVerifiableAttributeRequestItem,
        _params: AcceptVerifiableAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<RequestVerifiableAttributeAcceptResponseItem> {
        const parsedRequestAttribute = JSON.parse(JSON.stringify(requestItem.attribute));

        const vcProcessor = await getVCProcessor(SupportedVCTypes.SdJwtVc, this.accountController);
        const signedCredential = await vcProcessor.issue(parsedRequestAttribute, requestItem.did);
        requestItem.attribute.proof = { credential: signedCredential, credentialType: SupportedVCTypes.SdJwtVc };
        const peerAttribute = await this.consumptionController.attributes.createSharedLocalAttribute({
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });

        return RequestVerifiableAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attribute: requestItem.attribute,
            attributeId: peerAttribute.id
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: RequestVerifiableAttributeAcceptResponseItem,
        _requestItem: RequestVerifiableAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        const creationResult = await this.consumptionController.attributes.createRepositoryAttribute({
            content: responseItem.attribute
        });
        await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            peer: requestInfo.peer,
            sourceAttributeId: creationResult.id,
            requestReference: requestInfo.id,
            attributeId: responseItem.attributeId
        });
    }
}
