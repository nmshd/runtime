import {
    CreateAttributeWithKeyBindingAcceptResponseItem,
    CreateAttributeWithKeyBindingRequestItem,
    IdentityAttribute,
    RelationshipAttribute,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class CreateAttributeWithKeyBindingRequestItemProcessor extends GenericRequestItemProcessor<CreateAttributeWithKeyBindingRequestItem> {
    public override async canCreateOutgoingRequestItem(
        requestItem: CreateAttributeWithKeyBindingRequestItem,
        _request?: Request,
        recipient?: CoreAddress
    ): Promise<ValidationResult> {
        const recipientIsAttributeOwner = requestItem.attribute.owner.equals(recipient);
        const senderIsAttributeOwner = requestItem.attribute.owner.equals(this.currentIdentityAddress);
        const ownerIsEmptyString = requestItem.attribute.owner.toString() === "";

        if (!this.consumptionController.attributes.validateAttributeCharacters(requestItem.attribute)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The Attribute contains forbidden characters."));
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            if (senderIsAttributeOwner) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "Cannot create own IdentityAttributes with a CreateAttributeRequestItem. Use a ShareAttributeRequestItem instead."
                    )
                );
            }

            if (!(recipientIsAttributeOwner || ownerIsEmptyString)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "The owner of the provided IdentityAttribute for the `attribute` property can only be the address of the recipient or an empty string. The latter will default to the address of the recipient."
                    )
                );
            }

            const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(requestItem.attribute);
            if (tagValidationResult.isError()) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
            }
        }

        if (requestItem.attribute instanceof RelationshipAttribute) {
            if (!(recipientIsAttributeOwner || senderIsAttributeOwner || ownerIsEmptyString)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "The owner of the provided RelationshipAttribute for the `attribute` property can only be the address of the sender, the address of the recipient or an empty string. The latter will default to the address of the recipient."
                    )
                );
            }

            if (typeof recipient !== "undefined") {
                const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                    requestItem.attribute.key,
                    ownerIsEmptyString ? recipient : requestItem.attribute.owner,
                    requestItem.attribute.value.toJSON()["@type"],
                    recipient
                );

                if (relationshipAttributesWithSameKey.length !== 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem(
                            `The creation of the provided RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.attribute.key}', owner and value type.`
                        )
                    );
                }
            }
        }

        return ValidationResult.success();
    }

    public override async accept(
        _requestItem: CreateAttributeWithKeyBindingRequestItem,
        _params: AcceptRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<CreateAttributeWithKeyBindingAcceptResponseItem> {
        const keyBindingKey = await this.consumptionController.openId4Vc.generateKeyBindingKey();

        return CreateAttributeWithKeyBindingAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            jwk: keyBindingKey
        });
    }
}
