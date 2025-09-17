import { ApplicationError } from "@js-soft/ts-utils";
import { CoreAddress, CoreError, CoreId } from "@nmshd/core-types";

class Attributes {
    public attributeDoesNotExist() {
        return new CoreError("error.consumption.attributes.attributeDoesNotExist", "The specified Attribute does not exist.");
    }

    public alreadyForwarded(attributeId: CoreId, peer: CoreAddress) {
        return new CoreError("error.consumption.attributes.alreadyForwarded", `The Attribute '${attributeId.toString()} is already forwarded to peer '${peer.toString()}'.`);
    }

    public successorIsNotAValidAttribute(error: any) {
        return new CoreError(
            "error.consumption.attributes.successorIsNotAValidAttribute",
            "Validation failed during creation of successor.",
            error,
            undefined,
            error instanceof Error ? error : undefined
        );
    }

    public successionMustNotChangeKey() {
        return new CoreError(
            "error.consumption.attributes.successionMustNotChangeKey",
            "The predecessor RelationshipAttribute's key does not match that of the successor. The succession of a RelationshipAttribute must not change the key."
        );
    }

    public successionPeerIsNotOwner() {
        return new CoreError("error.consumption.attributes.successionPeerIsNotOwner", "The peer of the succeeded Attribute is not its owner. This may be an attempt of spoofing.");
    }

    public successorMustNotYetExist() {
        return new CoreError(
            "error.consumption.attributes.successorMustNotYetExist",
            "The predecessor Attribute's successor must not exist. It will be created by the succession handlers and must not be created manually."
        );
    }

    public predecessorDoesNotExist() {
        return new CoreError("error.consumption.attributes.predecessorDoesNotExist", "The predecessor does not exist.");
    }

    public successorDoesNotExist() {
        return new CoreError("error.consumption.attributes.successorDoesNotExist", "The successor does not exist.");
    }

    public successionMustChangeContent() {
        return new CoreError(
            "error.consumption.attributes.successionMustChangeContent",
            "The content of the successor matches that of the predecessor. An Attribute succession must change the Attribute's content."
        );
    }

    public successionMustNotChangeOwner() {
        return new CoreError(
            "error.consumption.attributes.successionMustNotChangeOwner",
            "The successor Attribute's owner does not match that of the predecessor. An Attribute succession must not change the Attribute's owner."
        );
    }

    public successionMustNotChangeValueType() {
        return new CoreError(
            "error.consumption.attributes.successionMustNotChangeValueType",
            "The successor Attribute's value type does not match that of the predecessor. An Attribute succession must not change the Attribute's value type."
        );
    }

    public successionMustNotChangeContentType() {
        return new CoreError(
            "error.consumption.attributes.successionMustNotChangeContentType",
            "The successor Attribute's content type does not match that of the predecessor. An Attribute succession must not change the Attribute's content type, i.e. an IdentityAttribute must not be succeeded by a RelationshipAttribute and v.v."
        );
    }

    public cannotSucceedAttributesWithASuccessor(successorId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedAttributesWithASuccessor",
            `The Attribute you want to succeed has a successor (id: ${successorId}). You cannot succeed Attributes with a successor. Instead, succeed the successor.`
        );
    }

    public cannotSucceedSharedAttributesDeletedByPeer() {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedSharedAttributesDeletedByPeer",
            "You cannot succeed shared Attributes that are already deleted by the peer."
        );
    }

    public cannotSetAttributeDeletionInfo(attributeId: string | CoreId, peer?: CoreAddress | string) {
        const errorMessageWithPeer = `You cannot set the deletionInfo of Attribute '${attributeId.toString()}' for peer '${peer?.toString()}' since it isn't shared with them or already deleted by them.`;
        const errorMessageWithoutPeer = `You cannot set the deletionInfo of Attribute '${attributeId.toString()}' since it is already deleted by the peer.`;
        const errorMessage = peer ? errorMessageWithPeer : errorMessageWithoutPeer;

        return new CoreError("error.consumption.attributes.cannotSetAttributeDeletionInfo", errorMessage);
    }

    public cannotSetForwardedSharingInfoForPeer(attributeId: string | CoreId, peer: CoreAddress | string) {
        return new CoreError(
            "error.consumption.attributes.cannotSetForwardedSharingInfoForPeer",
            `You cannot set the forwardedSharingInfo of Attribute '${attributeId.toString()}' for peer '${peer.toString()}' since they are the peer of the Relationship in whose context the RelationshipAttribute exists.`
        );
    }

    public wrongRelationshipStatusToSetDeletionInfo() {
        return new CoreError(
            "error.consumption.attributes.wrongRelationshipStatusToSetDeletionInfo",
            "In order to manually set the deletionInfo of an Attribute, the corresponding Relationship must have status 'DeletionProposed'."
        );
    }

    public wrongOwnerOfAttribute(message: string) {
        return new CoreError("error.consumption.attributes.wrongOwnerOfAttribute", message);
    }

    public wrongTypeOfAttribute(message: string) {
        return new CoreError("error.consumption.attributes.wrongTypeOfAttribute", message);
    }

    public senderIsNotPeerOfSharedAttribute(senderId: string | CoreAddress, attributeId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.senderIsNotPeerOfSharedAttribute",
            `The sender (id: '${senderId}') of the Notification is not the peer you shared the Attribute (id: '${attributeId}') with.`
        );
    }

    public setDefaultOwnIdentityAttributesIsDisabled() {
        return new CoreError("error.consumption.attributes.setDefaultOwnIdentityAttributesIsDisabled", "Setting default OwnIdentityAttributes is disabled for this Account.");
    }

    public invalidTags(tags: string[]): ApplicationError {
        return new ApplicationError("error.consumption.attributes.invalidTags", `Detected invalidity of the following tags: '${tags.join("', '")}'.`);
    }

    public forbiddenCharactersInAttribute(message: string) {
        return new CoreError("error.consumption.attributes.forbiddenCharactersInAttribute", message);
    }
}

class Requests {
    public unexpectedErrorDuringRequestItemProcessing(error: any) {
        return new CoreError(
            "error.consumption.requests.unexpectedErrorDuringRequestItemProcessing",
            error instanceof Error ? error.message : `Unknown error: '${JSON.stringify(error)}'`,
            undefined,
            undefined,
            error
        );
    }

    public servalErrorDuringRequestItemProcessing(error: any) {
        return new CoreError(
            "error.consumption.requests.servalErrorDuringRequestItemProcessing",
            error instanceof Error ? error.message : `Serval error: '${JSON.stringify(error)}'`,
            undefined,
            undefined,
            error
        );
    }

    public invalidAcceptParameters(message: string): ApplicationError {
        return new ApplicationError("error.consumption.requests.invalidAcceptParameters", message);
    }

    public invalidRequestItem(message: string) {
        return new CoreError("error.consumption.requests.invalidRequestItem", message);
    }

    public attributeQueryMismatch(message: string) {
        return new CoreError("error.consumption.requests.attributeQueryMismatch", message);
    }

    public cannotShareRelationshipAttributeOfPendingRelationship() {
        return new CoreError(
            "error.consumption.requests.cannotShareRelationshipAttributeOfPendingRelationship",
            "The provided RelationshipAttribute exists in the context of a pending Relationship and therefore cannot be shared."
        );
    }

    public wrongRelationshipStatus(message: string) {
        return new CoreError("error.consumption.requests.wrongRelationshipStatus", message);
    }

    public missingRelationship(message: string) {
        return new CoreError("error.consumption.requests.missingRelationship", message);
    }

    public peerIsDeleted(message: string) {
        return new CoreError("error.consumption.requests.peerIsDeleted", message);
    }

    public peerIsInDeletion(message: string) {
        return new CoreError("error.consumption.requests.peerIsInDeletion", message);
    }

    public violatedKeyUniquenessOfRelationshipAttributes(message: string) {
        return new CoreError("error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes", message);
    }

    public inheritedFromItem(message: string) {
        return new ApplicationError("error.consumption.requests.validation.inheritedFromItem", message);
    }

    public cannotShareRequestWithYourself() {
        return new CoreError("error.consumption.requests.cannotShareRequestWithYourself", "You cannot share a Request with yourself.");
    }

    public cannotCreateRequestWithExpirationDateInPast() {
        return new CoreError("error.consumption.requests.cannotCreateRequestWithExpirationDateInPast", "You cannot create a Request with an expiration date that is in the past.");
    }

    public cannotCreateRequestWithDuplicateId(id: string) {
        return new CoreError(
            "error.consumption.requests.cannotCreateRequestWithDuplicateId",
            `You cannot create the Request since there already is a Request with the id '${id}'.`
        );
    }

    public canOnlyDeleteIncomingRequestThatIsExpired(id: string, status: string) {
        return new CoreError(
            "error.consumption.requests.canOnlyDeleteIncomingRequestThatIsExpired",
            `The incoming Request '${id}' is in status '${status}'. At the moment, you can only delete incoming Requests that are expired.`
        );
    }

    private static readonly _decideValidation = class {
        public invalidNumberOfItems(message: string) {
            return new ApplicationError("error.consumption.requests.decide.validation.invalidNumberOfItems", message);
        }

        public itemAcceptedButRequestNotAccepted(message: string): ApplicationError {
            return new ApplicationError("error.consumption.requests.decide.validation.itemAcceptedButRequestNotAccepted", message);
        }

        public mustBeAcceptedItemNotAccepted(message: string): ApplicationError {
            return new ApplicationError("error.consumption.requests.decide.validation.mustBeAcceptedItemNotAccepted", message);
        }

        public requestItemAnsweredAsRequestItemGroup(): ApplicationError {
            return new ApplicationError(
                "error.consumption.requests.decide.validation.requestItemAnsweredAsRequestItemGroup",
                "The RequestItem was answered as a RequestItemGroup."
            );
        }

        public requestItemGroupAnsweredAsRequestItem(): ApplicationError {
            return new ApplicationError(
                "error.consumption.requests.decide.validation.requestItemGroupAnsweredAsRequestItem",
                "The RequestItemGroup was answered as a RequestItem."
            );
        }
    };

    public readonly decideValidation = new Requests._decideValidation();
}

export class ConsumptionCoreErrors {
    public static attributes = new Attributes();
    public static requests = new Requests();
}
