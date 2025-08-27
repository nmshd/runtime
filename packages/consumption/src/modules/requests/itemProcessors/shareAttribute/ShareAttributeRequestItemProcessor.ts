import {
    AttributeAlreadySharedAcceptResponseItem,
    IdentityAttribute,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult,
    ShareAttributeAcceptResponseItem,
    ShareAttributeRequestItem
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { RelationshipStatus } from "@nmshd/transport";
import _ from "lodash";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { OwnIdentityAttribute, OwnRelationshipAttribute, PeerRelationshipAttribute, ReceivedAttributeDeletionStatus } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class ShareAttributeRequestItemProcessor extends GenericRequestItemProcessor<ShareAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: ShareAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const foundAttribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);

        if (!foundAttribute) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The Attribute with the given attributeId '${requestItem.attributeId.toString()}' could not be found.`)
            );
        }

        const requestItemAttributeJSON = requestItem.attribute.toJSON();
        if (!_.isEqual(foundAttribute.content.toJSON(), requestItemAttributeJSON)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The Attribute with the given attributeId '${requestItem.attributeId.toString()}' does not match the given Attribute.`
                )
            );
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            if (!(foundAttribute instanceof OwnIdentityAttribute)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem("The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes.")
                );
            }

            // TODO: this also applies to RelationshipAttributes that can be shared with third parties
            if (recipient) {
                if (foundAttribute.isForwardedTo(recipient, true)) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem(
                            `The IdentityAttribute with the given attributeId '${requestItem.attributeId.toString()}' is already shared with the peer.`
                        )
                    );
                }

                const sharedSuccessors = await this.consumptionController.attributes.getSharedSuccessorsOfAttribute(foundAttribute, recipient);
                if (sharedSuccessors.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem(
                            `The provided IdentityAttribute is outdated. Its successor '${sharedSuccessors[0].id}' is already shared with the peer.`
                        )
                    );
                }

                const sharedPredecessors = await this.consumptionController.attributes.getSharedPredecessorsOfAttribute(foundAttribute, recipient);
                if (sharedPredecessors.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem(
                            `The predecessor '${sharedPredecessors[0].id}' of the IdentityAttribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`
                        )
                    );
                }
            }

            if (requestItem.thirdPartyAddress) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("When sharing an own IdentityAttribute, no thirdPartyAddress may be specified."));
            }

            const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(requestItem.attribute);
            if (tagValidationResult.isError()) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
            }

            return ValidationResult.success();
        }

        if (requestItem.attribute instanceof RelationshipAttribute) {
            if (!(foundAttribute instanceof OwnRelationshipAttribute || foundAttribute instanceof PeerRelationshipAttribute)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("You cannot share ThirdPartyRelationshipAttributes."));
            }

            if (recipient && (foundAttribute.peerSharingInfo.peer.equals(recipient) || foundAttribute.isForwardedTo(recipient, true))) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem("The provided RelationshipAttribute already exists in the context of the Relationship with the peer.")
                );
            }

            const initialPeer = foundAttribute.peerSharingInfo.peer;
            const queryForNonPendingRelationships = {
                "peer.address": initialPeer.toString(),
                status: { $in: [RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed] }
            };

            const nonPendingRelationshipsToPeer = await this.accountController.relationships.getRelationships(queryForNonPendingRelationships);

            if (nonPendingRelationshipsToPeer.length === 0) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.cannotShareRelationshipAttributeOfPendingRelationship());
            }

            if (!requestItem.thirdPartyAddress?.equals(initialPeer)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "When sharing a RelationshipAttribute with another Identity, the address of the peer of the Relationship in which the RelationshipAttribute exists must be specified as thirdPartyAddress."
                    )
                );
            }

            if (requestItem.attribute.owner.equals(recipient)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("It doesn't make sense to share a RelationshipAttribute with its owner."));
            }

            if (requestItem.attribute.confidentiality === RelationshipAttributeConfidentiality.Private) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem("The confidentiality of the given `attribute` is private. Therefore you are not allowed to share it.")
                );
            }

            return ValidationResult.success();
        }

        return ValidationResult.success();
    }

    public override async canAccept(requestItem: ShareAttributeRequestItem, _params: AcceptRequestItemParametersJSON, _requestInfo: LocalRequestInfo): Promise<ValidationResult> {
        const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(requestItem.attribute);
        if (tagValidationResult.isError()) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
        }

        if (requestItem.thirdPartyAddress && requestItem.attribute instanceof IdentityAttribute) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem("The RequestItem is invalid, since it must contain a RelationshipAttribute if thirdPartyAddress is defined.")
            );
        }

        if (!requestItem.thirdPartyAddress && requestItem.attribute instanceof RelationshipAttribute) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem("The RequestItem is invalid, since it must contain an IdentityAttribute if thirdPartyAddress is undefined.")
            );
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: ShareAttributeRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ShareAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const isThirdPartyRelationshipAttribute = !!requestItem.thirdPartyAddress;
        if (isThirdPartyRelationshipAttribute) {
            const thirdPartyRelationshipAttribute = await this.consumptionController.attributes.createThirdPartyRelationshipAttribute({
                id: requestItem.attributeId,
                content: requestItem.attribute as RelationshipAttribute,
                peer: requestInfo.peer,
                sourceReference: requestInfo.id,
                initialAttributePeer: requestItem.thirdPartyAddress!
            });

            // TODO: returning the attributeId is unnecessary now
            return ShareAttributeAcceptResponseItem.from({
                attributeId: thirdPartyRelationshipAttribute.id,
                result: ResponseItemResult.Accepted
            });
        }

        // TODO: check if this is also required for ThirdPartyRelationshipAttributes
        const existingPeerIdentityAttribute = await this.consumptionController.attributes.getPeerIdentityAttributeWithSameValue(
            (requestItem.attribute.value as any).toJSON(),
            requestInfo.peer.toString()
        );

        if (existingPeerIdentityAttribute) {
            if (existingPeerIdentityAttribute.peerSharingInfo.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted) {
                // TODO: refactor using AttributesController function
                // TODO: test
                existingPeerIdentityAttribute.peerSharingInfo.deletionInfo = undefined;
                await this.consumptionController.attributes.updateAttributeUnsafe(existingPeerIdentityAttribute);
            }

            return AttributeAlreadySharedAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: existingPeerIdentityAttribute.id
            });
        }

        const localAttribute = await this.consumptionController.attributes.createPeerIdentityAttribute({
            content: requestItem.attribute as IdentityAttribute,
            peer: requestInfo.peer,
            sourceReference: requestInfo.id,
            id: requestItem.attributeId
        });

        return ShareAttributeAcceptResponseItem.from({
            attributeId: localAttribute.id,
            result: ResponseItemResult.Accepted
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: ShareAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
        requestItem: ShareAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (responseItem instanceof RejectResponseItem) return;

        const sharedAttribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
        if (
            !sharedAttribute ||
            !(sharedAttribute instanceof OwnIdentityAttribute || sharedAttribute instanceof OwnRelationshipAttribute || sharedAttribute instanceof PeerRelationshipAttribute)
        ) {
            return;
        }

        // TODO: write test for this
        if (responseItem instanceof AttributeAlreadySharedAcceptResponseItem && sharedAttribute.isToBeDeletedByForwardingPeer(requestInfo.peer)) {
            await this.consumptionController.attributes.setForwardedDeletionInfoOfAttribute(sharedAttribute, undefined, requestInfo.peer, true);
            return;
        }

        await this.consumptionController.attributes.addForwardedSharingInfoToAttribute(sharedAttribute, requestInfo.peer, requestInfo.id);
    }
}
