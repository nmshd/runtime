import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
    IdentityAttribute,
    RejectResponseItem,
    RelationshipAttribute,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { PeerIdentityAttribute, PeerIdentityAttributeSuccessorParams, PeerSharedAttributeSucceededEvent } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import createAppropriateResponseItem from "../utility/createAppropriateResponseItem";

export class CreateAttributeRequestItemProcessor extends GenericRequestItemProcessor<CreateAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: CreateAttributeRequestItem, _request?: Request, recipient?: CoreAddress): Promise<ValidationResult> {
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

    public override async canAccept(requestItem: CreateAttributeRequestItem, _params: AcceptRequestItemParametersJSON, requestInfo: LocalRequestInfo): Promise<ValidationResult> {
        if (!this.consumptionController.attributes.validateAttributeCharacters(requestItem.attribute)) {
            throw ConsumptionCoreErrors.attributes.forbiddenCharactersInAttribute("The Attribute contains forbidden characters.");
        }

        if (requestItem.attribute instanceof RelationshipAttribute) {
            const ownerIsEmptyString = requestItem.attribute.owner.toString() === "";

            const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                requestItem.attribute.key,
                ownerIsEmptyString ? this.currentIdentityAddress : requestItem.attribute.owner,
                requestItem.attribute.value.toJSON()["@type"],
                requestInfo.peer
            );

            if (relationshipAttributesWithSameKey.length !== 0) {
                if (requestItem.mustBeAccepted) {
                    throw ConsumptionCoreErrors.requests.violatedKeyUniquenessOfRelationshipAttributes(
                        `The provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.attribute.key}', owner and value type.`
                    );
                }

                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        `This CreateAttributeRequestItem cannot be accepted as the provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.attribute.key}', owner and value type.`
                    )
                );
            }
        }

        const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(requestItem.attribute);
        if (tagValidationResult.isError()) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: CreateAttributeRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<CreateAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem> {
        if (requestItem.attribute.owner.toString() === "") {
            requestItem.attribute.owner = this.currentIdentityAddress;
        }

        if (requestItem.attribute instanceof RelationshipAttribute) {
            if (requestItem.attribute.owner === this.currentIdentityAddress) {
                const ownRelationshipAttribute = await this.consumptionController.attributes.createOwnRelationshipAttribute({
                    content: requestItem.attribute,
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id
                });

                return CreateAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownRelationshipAttribute.id
                });
            }

            const peerRelationshipAttribute = await this.consumptionController.attributes.createPeerRelationshipAttribute({
                content: requestItem.attribute,
                peer: requestInfo.peer,
                sourceReference: requestInfo.id
            });

            return CreateAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: peerRelationshipAttribute.id
            });
        }

        return await createAppropriateResponseItem(requestItem.attribute, requestInfo, this.consumptionController.attributes, "Create");
    }

    public override async applyIncomingResponseItem(
        responseItem: CreateAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
        requestItem: CreateAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<PeerSharedAttributeSucceededEvent | void> {
        if (responseItem instanceof AttributeAlreadySharedAcceptResponseItem) return;

        if (requestItem.attribute.owner.toString() === "") requestItem.attribute.owner = requestInfo.peer;

        const isOwnAttribute = requestItem.attribute.owner.toString() === this.currentIdentityAddress.toString();
        const isPeerAttribute = requestItem.attribute.owner.toString() === requestInfo.peer.toString();

        const sharingInfo = {
            peer: requestInfo.peer,
            sourceReference: requestInfo.id,
            sharedAt: CoreDate.utc()
        };

        if (responseItem instanceof CreateAttributeAcceptResponseItem) {
            if (requestItem.attribute instanceof IdentityAttribute && isPeerAttribute) {
                await this.consumptionController.attributes.createPeerIdentityAttribute({
                    id: responseItem.attributeId,
                    content: requestItem.attribute,
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id
                });
                return;
            }

            if (requestItem.attribute instanceof RelationshipAttribute && isPeerAttribute) {
                await this.consumptionController.attributes.createPeerRelationshipAttribute({
                    id: responseItem.attributeId,
                    content: requestItem.attribute,
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id
                });
                return;
            }

            if (requestItem.attribute instanceof RelationshipAttribute && isOwnAttribute) {
                await this.consumptionController.attributes.createOwnRelationshipAttribute({
                    id: responseItem.attributeId,
                    content: requestItem.attribute,
                    peer: requestInfo.peer,
                    sourceReference: requestInfo.id
                });
                return;
            }
        }

        if (responseItem instanceof AttributeSuccessionAcceptResponseItem && responseItem.successorContent instanceof IdentityAttribute) {
            const predecessor = await this.consumptionController.attributes.getLocalAttribute(responseItem.predecessorId);
            if (!predecessor || !(predecessor instanceof PeerIdentityAttribute)) return;

            const successorParams = PeerIdentityAttributeSuccessorParams.from({
                id: responseItem.successorId,
                content: responseItem.successorContent,
                sharingInfo
            });
            const { predecessor: updatedPredecessor, successor } = await this.consumptionController.attributes.succeedPeerIdentityAttribute(predecessor, successorParams);
            // TODO: check publishing of events
            return new PeerSharedAttributeSucceededEvent(this.currentIdentityAddress.toString(), updatedPredecessor, successor);
        }
    }
}
