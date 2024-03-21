import {
    IdentityAttribute,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult,
    ShareAttributeAcceptResponseItem,
    ShareAttributeRequestItem
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import _ from "lodash";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class ShareAttributeRequestItemProcessor extends GenericRequestItemProcessor<ShareAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: ShareAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.sourceAttributeId);
        if (!attribute) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(`The Attribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' could not be found.`)
            );
        }

        const requestItemAttributeJSON = requestItem.attribute.toJSON();
        if (requestItemAttributeJSON.owner === "") {
            requestItemAttributeJSON.owner = this.currentIdentityAddress.toString();
        }

        if (!_.isEqual(attribute.content.toJSON(), requestItemAttributeJSON)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    `The Attribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' does not match the given attribute.`
                )
            );
        }

        if (attribute.shareInfo?.sourceAttribute !== undefined) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("Only Attributes that are not a copy of a sourceAttribute can be shared."));
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            return this.canCreateWithIdentityAttribute(requestItem);
        }

        return this.canCreateWithRelationshipAttribute(requestItem.attribute, recipient);
    }

    private canCreateWithIdentityAttribute(requestItem: ShareAttributeRequestItem) {
        const ownerIsEmpty = requestItem.attribute.owner.toString() === "";
        const ownerIsCurrentIdentity = requestItem.attribute.owner.equals(this.currentIdentityAddress);
        if (!ownerIsEmpty && !ownerIsCurrentIdentity) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("The Sender of the given Identityattribute can only be the owner."));
        }

        return ValidationResult.success();
    }

    private canCreateWithRelationshipAttribute(attribute: RelationshipAttribute, recipient?: CoreAddress) {
        if (attribute.confidentiality === RelationshipAttributeConfidentiality.Private) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem("The confidentiality of the given `attribute` is private. Therefore you are not allowed to share it.")
            );
        }

        if (attribute.owner.equals(recipient)) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("It doesn't make sense to share a RelationshipAttribute with its owner."));
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: ShareAttributeRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ShareAttributeAcceptResponseItem> {
        if (requestItem.attribute.owner.toString() === "") {
            requestItem.attribute.owner = requestInfo.peer;
        }

        const localAttribute = await this.consumptionController.attributes.createPeerLocalAttribute({
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });

        return ShareAttributeAcceptResponseItem.from({
            attributeId: localAttribute.id,
            result: ResponseItemResult.Accepted
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: ShareAttributeAcceptResponseItem | RejectResponseItem,
        requestItem: ShareAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof ShareAttributeAcceptResponseItem)) {
            return;
        }

        await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            attributeId: responseItem.attributeId,
            sourceAttributeId: requestItem.sourceAttributeId,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });
    }
}
