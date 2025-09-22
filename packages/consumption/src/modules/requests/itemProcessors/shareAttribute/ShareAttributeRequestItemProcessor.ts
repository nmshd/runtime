import {
    AcceptResponseItem,
    AttributeAlreadySharedAcceptResponseItem,
    IdentityAttribute,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult,
    ShareAttributeRequestItem
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { RelationshipStatus } from "@nmshd/transport";
import _ from "lodash";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerRelationshipAttribute,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttributeDeletionStatus
} from "../../../attributes";
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

        if (!(foundAttribute instanceof OwnIdentityAttribute || foundAttribute instanceof OwnRelationshipAttribute || foundAttribute instanceof PeerRelationshipAttribute)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The Attribute with the given attributeId '${requestItem.attributeId.toString()}' is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute.`
                )
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

        if (recipient) {
            if (foundAttribute.isForwardedTo(recipient, true)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The Attribute with the given attributeId '${requestItem.attributeId.toString()}' is already shared with the peer.`
                    )
                );
            }

            const sharedSuccessors = await this.consumptionController.attributes.getSuccessorsOfAttributeSharedWithPeer(foundAttribute, recipient);
            if (sharedSuccessors.length > 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The provided Attribute is outdated. Its successor '${sharedSuccessors[0].id}' is already shared with the peer.`
                    )
                );
            }

            const sharedPredecessors = await this.consumptionController.attributes.getPredecessorsOfAttributeSharedWithPeer(foundAttribute, recipient);
            if (sharedPredecessors.length > 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The predecessor '${sharedPredecessors[0].id}' of the Attribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`
                    )
                );
            }
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            if (!(foundAttribute instanceof OwnIdentityAttribute)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem("The provided IdentityAttribute belongs to someone else. You can only share OwnIdentityAttributes.")
                );
            }

            if (requestItem.thirdPartyAddress) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("When sharing an OwnIdentityAttribute, no thirdPartyAddress may be specified."));
            }

            const tagValidationResult = await this.consumptionController.attributes.validateTagsOfAttribute(requestItem.attribute);
            if (tagValidationResult.isError()) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(tagValidationResult.error.message));
            }

            return ValidationResult.success();
        }

        if (!(foundAttribute instanceof OwnRelationshipAttribute || foundAttribute instanceof PeerRelationshipAttribute)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("You cannot share ThirdPartyRelationshipAttributes."));
        }

        if (recipient && foundAttribute.peerSharingDetails.peer.equals(recipient)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem("The provided RelationshipAttribute already exists in the context of the Relationship with the peer.")
            );
        }

        const initialPeer = foundAttribute.peerSharingDetails.peer;
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
    ): Promise<AcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const isThirdPartyRelationshipAttribute = !!requestItem.thirdPartyAddress;
        if (isThirdPartyRelationshipAttribute) {
            const attribute = requestItem.attribute as RelationshipAttribute;
            const existingThirdPartyRelationshipAttribute = await this.consumptionController.attributes.getThirdPartyRelationshipAttributeWithSameValue(
                (attribute.value as any).toJSON(),
                requestInfo.peer.toString(),
                attribute.owner.toString(),
                attribute.key
            );

            if (existingThirdPartyRelationshipAttribute) {
                if (existingThirdPartyRelationshipAttribute.peerSharingDetails.deletionInfo?.deletionStatus === ThirdPartyRelationshipAttributeDeletionStatus.ToBeDeleted) {
                    await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttribute(existingThirdPartyRelationshipAttribute, undefined, true);
                }

                return AttributeAlreadySharedAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: existingThirdPartyRelationshipAttribute.id
                });
            }

            await this.consumptionController.attributes.createThirdPartyRelationshipAttribute({
                id: requestItem.attributeId,
                content: requestItem.attribute as RelationshipAttribute,
                peer: requestInfo.peer,
                sourceReference: requestInfo.id,
                initialAttributePeer: requestItem.thirdPartyAddress!
            });

            return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
        }

        const existingPeerIdentityAttribute = await this.consumptionController.attributes.getPeerIdentityAttributeWithSameValue(
            (requestItem.attribute.value as any).toJSON(),
            requestInfo.peer.toString()
        );

        if (existingPeerIdentityAttribute) {
            if (existingPeerIdentityAttribute.peerSharingDetails.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted) {
                await this.consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(existingPeerIdentityAttribute, undefined, true);
            }

            return AttributeAlreadySharedAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: existingPeerIdentityAttribute.id
            });
        }

        await this.consumptionController.attributes.createPeerIdentityAttribute({
            content: requestItem.attribute as IdentityAttribute,
            peer: requestInfo.peer,
            sourceReference: requestInfo.id,
            id: requestItem.attributeId
        });

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }

    public override async applyIncomingResponseItem(
        responseItem: AcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
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

        if (responseItem instanceof AttributeAlreadySharedAcceptResponseItem && sharedAttribute.hasDeletionStatusUnequalDeletedByRecipient(requestInfo.peer)) {
            await this.consumptionController.attributes.setForwardedDeletionInfoOfAttribute(sharedAttribute, undefined, requestInfo.peer, true);
            return;
        }

        await this.consumptionController.attributes.addForwardedSharingDetailsToAttribute(sharedAttribute, requestInfo.peer, requestInfo.id);
    }
}
