import { CreateAttributeAcceptResponseItem, CreateAttributeRequestItem, IdentityAttribute, RejectResponseItem, Request, ResponseItemResult } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { LocalAttribute } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class CreateAttributeRequestItemProcessor extends GenericRequestItemProcessor<CreateAttributeRequestItem> {
    public override canCreateOutgoingRequestItem(
        requestItem: CreateAttributeRequestItem,
        _request?: Request,
        recipient?: CoreAddress
    ): ValidationResult | Promise<ValidationResult> {
        const recipientIsAttributeOwner = requestItem.attribute.owner.equals(recipient);
        const senderIsAttributeOwner = requestItem.attribute.owner.equals(this.currentIdentityAddress);
        const ownerIsEmptyString = requestItem.attribute.owner.toString() === "";

        if (requestItem.attribute instanceof IdentityAttribute) {
            if (senderIsAttributeOwner) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidRequestItem("Cannot create own Attributes with a CreateAttributeRequestItem. Use a ShareAttributeRequestItem instead.")
                );
            }

            if (recipientIsAttributeOwner || ownerIsEmptyString || typeof recipient === "undefined") {
                return ValidationResult.success();
            }

            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    "The owner of the given `attribute` can only be the recipient's address or an empty string. The latter will default to the recipient's address."
                )
            );
        }

        if (recipientIsAttributeOwner || senderIsAttributeOwner || ownerIsEmptyString || typeof recipient === "undefined") {
            return ValidationResult.success();
        }

        return ValidationResult.error(
            CoreErrors.requests.invalidRequestItem(
                "The owner of the given 'attribute' can only be the sender's address, the recipient's address or an empty string. The latter will default to the recipient's address."
            )
        );
    }

    public override async accept(
        requestItem: CreateAttributeRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<CreateAttributeAcceptResponseItem> {
        if (requestItem.attribute.owner.toString() === "") {
            requestItem.attribute.owner = this.currentIdentityAddress;
        }

        let sharedAttribute: LocalAttribute;

        if (requestItem.attribute instanceof IdentityAttribute) {
            const repositoryAttribute = await this.consumptionController.attributes.createLocalAttribute({
                content: requestItem.attribute
            });

            sharedAttribute = await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                sourceAttributeId: repositoryAttribute.id
            });
        } else {
            sharedAttribute = await this.consumptionController.attributes.createPeerLocalAttribute({
                content: requestItem.attribute,
                peer: requestInfo.peer,
                requestReference: requestInfo.id
            });
        }

        return CreateAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: sharedAttribute.id
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: CreateAttributeAcceptResponseItem | RejectResponseItem,
        requestItem: CreateAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof CreateAttributeAcceptResponseItem)) {
            return;
        }

        if (requestItem.attribute.owner.toString() === "") {
            requestItem.attribute.owner = requestInfo.peer;
        }

        await this.consumptionController.attributes.createPeerLocalAttribute({
            id: responseItem.attributeId,
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });
    }
}
