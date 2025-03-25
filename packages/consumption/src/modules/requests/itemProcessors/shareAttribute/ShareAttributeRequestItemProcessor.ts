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
import { LocalAttributeDeletionStatus } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class ShareAttributeRequestItemProcessor extends GenericRequestItemProcessor<ShareAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: ShareAttributeRequestItem, _request: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const foundAttribute = await this.consumptionController.attributes.getLocalAttribute(requestItem.sourceAttributeId);

        if (typeof foundAttribute === "undefined") {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The Attribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' could not be found.`
                )
            );
        }

        const requestItemAttributeJSON = requestItem.attribute.toJSON();

        if (!_.isEqual(foundAttribute.content.toJSON(), requestItemAttributeJSON)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The Attribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' does not match the given Attribute.`
                )
            );
        }

        if (requestItem.attribute instanceof IdentityAttribute && this.accountController.identity.isMe(requestItem.attribute.owner)) {
            if (foundAttribute.isShared()) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "The provided IdentityAttribute is a shared copy of a RepositoryAttribute. You can only share RepositoryAttributes."
                    )
                );
            }

            if (typeof recipient !== "undefined") {
                const query = {
                    "shareInfo.sourceAttribute": requestItem.sourceAttributeId.toString(),
                    "shareInfo.peer": recipient.toString(),
                    "deletionInfo.deletionStatus": { $nin: [LocalAttributeDeletionStatus.DeletedByPeer, LocalAttributeDeletionStatus.ToBeDeletedByPeer] }
                };

                if ((await this.consumptionController.attributes.getLocalAttributes(query)).length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem(
                            `The IdentityAttribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' is already shared with the peer.`
                        )
                    );
                }

                const ownSharedIdentityAttributeSuccessors = await this.consumptionController.attributes.getSharedSuccessorsOfAttribute(foundAttribute, {
                    "shareInfo.peer": recipient.toString(),
                    "deletionInfo.deletionStatus": { $nin: [LocalAttributeDeletionStatus.DeletedByPeer, LocalAttributeDeletionStatus.ToBeDeletedByPeer] }
                });

                if (ownSharedIdentityAttributeSuccessors.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem(
                            `The provided IdentityAttribute is outdated. Its successor '${ownSharedIdentityAttributeSuccessors[0].shareInfo?.sourceAttribute}' is already shared with the peer.`
                        )
                    );
                }

                const ownSharedIdentityAttributePredecessors = await this.consumptionController.attributes.getSharedPredecessorsOfAttribute(foundAttribute, {
                    "shareInfo.peer": recipient.toString(),
                    "deletionInfo.deletionStatus": { $nin: [LocalAttributeDeletionStatus.DeletedByPeer, LocalAttributeDeletionStatus.ToBeDeletedByPeer] }
                });

                if (ownSharedIdentityAttributePredecessors.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem(
                            `The predecessor '${ownSharedIdentityAttributePredecessors[0].shareInfo?.sourceAttribute}' of the IdentityAttribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`
                        )
                    );
                }
            }

            if (requestItem.thirdPartyAddress) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("When sharing a RepositoryAttribute, no thirdPartyAddress may be specified."));
            }
        }

        if (requestItem.attribute instanceof RelationshipAttribute) {
            if (!foundAttribute.isShared()) {
                throw new Error(
                    "The LocalAttribute found is faulty because its shareInfo is undefined, although its content is given by a RelationshipAttribute. Since RelationshipAttributes only make sense in the context of Relationships, they must always be shared."
                );
            }

            if (typeof foundAttribute.shareInfo.sourceAttribute !== "undefined") {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem("You can only share RelationshipAttributes that are not a copy of a sourceAttribute.")
                );
            }

            if (typeof recipient !== "undefined") {
                const query = {
                    "shareInfo.sourceAttribute": requestItem.sourceAttributeId.toString(),
                    "shareInfo.peer": recipient.toString(),
                    "deletionInfo.deletionStatus": { $nin: [LocalAttributeDeletionStatus.DeletedByPeer, LocalAttributeDeletionStatus.ToBeDeletedByPeer] }
                };
                const thirdPartyRelationshipAttribute = await this.consumptionController.attributes.getLocalAttributes(query);

                if (foundAttribute.shareInfo.peer.equals(recipient) || thirdPartyRelationshipAttribute.length > 0) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidRequestItem("The provided RelationshipAttribute already exists in the context of the Relationship with the peer.")
                    );
                }
            }

            const queryForNonPendingRelationships = {
                "peer.address": foundAttribute.shareInfo.peer.address,
                status: { $in: [RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed] }
            };

            const nonPendingRelationshipsToPeer = await this.accountController.relationships.getRelationships(queryForNonPendingRelationships);

            if (nonPendingRelationshipsToPeer.length === 0) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.cannotShareRelationshipAttributeOfPendingRelationship());
            }

            if (!requestItem.thirdPartyAddress?.equals(foundAttribute.shareInfo.peer)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "When sharing a RelationshipAttribute with another Identity, the address of the peer of the Relationship in which the RelationshipAttribute exists must be specified as thirdPartyAddress."
                    )
                );
            }
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            return this.canCreateWithIdentityAttribute(requestItem);
        }

        return ShareAttributeRequestItemProcessor.canCreateWithRelationshipAttribute(requestItem.attribute, recipient);
    }

    private canCreateWithIdentityAttribute(requestItem: ShareAttributeRequestItem) {
        const ownerIsCurrentIdentity = requestItem.attribute.owner.equals(this.currentIdentityAddress);
        if (!ownerIsCurrentIdentity) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem("The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes.")
            );
        }

        return ValidationResult.success();
    }

    private static canCreateWithRelationshipAttribute(attribute: RelationshipAttribute, recipient?: CoreAddress) {
        if (attribute.owner.equals(recipient)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("It doesn't make sense to share a RelationshipAttribute with its owner."));
        }

        if (attribute.confidentiality === RelationshipAttributeConfidentiality.Private) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem("The confidentiality of the given `attribute` is private. Therefore you are not allowed to share it.")
            );
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: ShareAttributeRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ShareAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem> {
        const existingPeerSharedIdentityAttribute = await this.consumptionController.attributes.getPeerSharedIdentityAttributeWithSameValue(
            (requestItem.attribute.value as any).toJSON(),
            requestInfo.peer.toString()
        );

        if (existingPeerSharedIdentityAttribute && !existingPeerSharedIdentityAttribute.deletionInfo) {
            return AttributeAlreadySharedAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: existingPeerSharedIdentityAttribute.id
            });
        }

        const localAttribute = await this.consumptionController.attributes.createSharedLocalAttribute({
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id,
            thirdPartyAddress: requestItem.thirdPartyAddress
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
