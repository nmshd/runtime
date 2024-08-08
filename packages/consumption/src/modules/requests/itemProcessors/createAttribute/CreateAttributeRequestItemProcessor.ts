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
            if (recipientIsAttributeOwner || ownerIsEmptyString) {
                return ValidationResult.success();
            }

            if (senderIsAttributeOwner) {
                return ValidationResult.error(
                    CoreErrors.requests.invalidRequestItem("Cannot create own IdentityAttributes with a CreateAttributeRequestItem. Use a ShareAttributeRequestItem instead.")
                );
            }

            if (typeof recipient !== "undefined") {
                return ValidationResult.error(
                    CoreErrors.requests.invalidRequestItem(
                        "The owner of the provided IdentityAttribute for the `attribute` property can only be the Recipient's Address or an empty string. The latter will default to the Recipient's Address."
                    )
                );
            }

            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    "The owner of the provided IdentityAttribute for the `attribute` property can only be an empty string. It will default to the Recipient's Address."
                )
            );
        }

        if (recipientIsAttributeOwner || senderIsAttributeOwner || ownerIsEmptyString) {
            return ValidationResult.success();
        }

        if (typeof recipient !== "undefined") {
            return ValidationResult.error(
                CoreErrors.requests.invalidRequestItem(
                    "The owner of the provided RelationshipAttribute for the `attribute` property can only be the Sender's Address, the Recipient's Address or an empty string. The latter will default to the Recipient's Address."
                )
            );
        }

        return ValidationResult.error(
            CoreErrors.requests.invalidRequestItem(
                "The owner of the provided RelationshipAttribute for the `attribute` property can only be the Sender's Address or an empty string. The latter will default to the Recipient's Address."
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
            const repositoryAttribute = await this.consumptionController.attributes.createRepositoryAttribute({
                content: requestItem.attribute
            });

            sharedAttribute = await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                sourceAttributeId: repositoryAttribute.id
            });
        } else {
            sharedAttribute = await this.consumptionController.attributes.createSharedLocalAttribute({
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

        await this.consumptionController.attributes.createSharedLocalAttribute({
            id: responseItem.attributeId,
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });
    }
}
