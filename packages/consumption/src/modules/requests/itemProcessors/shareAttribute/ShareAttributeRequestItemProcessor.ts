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
        const foundAttribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.sourceAttributeId);

        if (!foundAttribute) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(`The Attribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' could not be found.`)
            );
        }

        const requestItemAttributeJSON = requestItem.attribute.toJSON();
        if (requestItemAttributeJSON.owner === "") {
            requestItemAttributeJSON.owner = this.currentIdentityAddress.toString();
        }

        if (!_.isEqual(foundAttribute.content.toJSON(), requestItemAttributeJSON)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    `The Attribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' does not match the given attribute.`
                )
            );
        }

        if (foundAttribute.isShared() && requestItem.attribute instanceof IdentityAttribute && this.accountController.identity.isMe(requestItem.attribute.owner)) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem("The provided IdentityAttribute is a shared copy of a RepositoryAttribute. You can only share RepositoryAttributes.")
            );
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            return this.canCreateWithIdentityAttribute(requestItem);
        }

        return this.canCreateWithRelationshipAttribute(requestItem.attribute, recipient);
    }

    private canCreateWithIdentityAttribute(requestItem: ShareAttributeRequestItem) {
        const ownerIsCurrentIdentity = requestItem.attribute.owner.equals(this.currentIdentityAddress);
        if (!ownerIsCurrentIdentity) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem("The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes.")
            );
        }

        return ValidationResult.success();
    }

    private canCreateWithRelationshipAttribute(attribute: RelationshipAttribute, recipient?: CoreAddress) {
        if (attribute.owner.equals(recipient)) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem("It doesn't make sense to share a RelationshipAttribute with its owner."));
        }

        if (attribute.confidentiality === RelationshipAttributeConfidentiality.Private) {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem("The confidentiality of the given `attribute` is private. Therefore you are not allowed to share it.")
            );
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
