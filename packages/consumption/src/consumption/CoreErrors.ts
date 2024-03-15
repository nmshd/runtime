import { ApplicationError } from "@js-soft/ts-utils";
import { CoreAddress, CoreError, CoreId } from "@nmshd/transport";

class Attributes {
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
            "The predecessor attribute's key does not match that of the successor. The succession of a relationship attribute must not change the key."
        );
    }

    public successionPeerIsNotOwner() {
        return new CoreError("error.consumption.attributes.successionPeerIsNotOwner", "The peer of the succeeded attribute is not its owner. This may be an attempt of spoofing.");
    }

    public predecessorSourceAttributeIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.predecessorSourceAttributeIsNotRepositoryAttribute", "Predecessor source attribute is not a repository attribute.");
    }

    public successorSourceAttributeIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.successorSourceAttributeIsNotRepositoryAttribute", "Successor source attribute is not a repository attribute.");
    }

    public successorSourceDoesNotSucceedPredecessorSource() {
        return new CoreError(
            "error.consumption.attributes.successorSourceDoesNotSucceedPredecessorSource",
            "Predecessor source attribute is not succeeded by successor source attribute."
        );
    }

    public sourceContentIsNotEqualToCopyContent() {
        return new CoreError(
            "error.consumption.attributes.sourceContentIsNotEqualToCopyContent",
            "Successor source attribute contents don't match successor shared attribute copy."
        );
    }

    public cannotSucceedChildOfComplexAttribute(parentId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedChildOfComplexAttribute",
            `The attribute you want to succeed is child attribute of a complex attribute (id: ${parentId}), and cannot be succeeded on its own. Instead, succeed the parent which will implicitly succeed all its children.`
        );
    }

    public successorMustNotYetExist() {
        return new CoreError(
            "error.consumption.attributes.successorMustNotYetExist",
            "The predecessor attribute's successor must not exist. It will be created by the succession handlers and must not be created manually."
        );
    }

    public successorMustNotHaveASuccessor(comment?: string) {
        let errorMessage = "The successor must not have a successor itself.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.successorMustNotHaveASuccessor", errorMessage);
    }

    public predecessorIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotRepositoryAttribute", "Predecessor is not a repository attribute.");
    }

    public predecessorIsNotOwnSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotOwnSharedIdentityAttribute", "Predecessor is not an own shared identity attribute.");
    }

    public predecessorIsNotPeerSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotPeerSharedIdentityAttribute", "Predecessor is not a peer shared identity attribute.");
    }

    public predecessorIsNotOwnSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotOwnSharedRelationshipAttribute", "Predecessor is not an own shared relationship attribute.");
    }

    public predecessorIsNotPeerSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotPeerSharedRelationshipAttribute", "Predecessor is not a peer shared relationship attribute.");
    }

    public successorIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotRepositoryAttribute", "Successor is not a repository attribute.");
    }

    public successorIsNotOwnSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotOwnSharedIdentityAttribute", "Successor is not an own shared identity attribute.");
    }

    public successorIsNotPeerSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotPeerSharedIdentityAttribute", "Successor is not a peer shared identity attribute.");
    }

    public successorIsNotOwnSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotOwnSharedRelationshipAttribute", "Successor is not an own shared relationship attribute.");
    }

    public successorIsNotPeerSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotPeerSharedRelationshipAttribute", "Successor is not a peer shared relationship attribute.");
    }

    public setPredecessorIdDoesNotMatchActualPredecessorId() {
        return new CoreError(
            "error.consumption.attributes.setPredecessorIdDoesNotMatchActualPredecessorId",
            "The predecessor's id and the explicitly set value for the successor's succeeds field don't match."
        );
    }

    public predecessorDoesNotExist() {
        return new CoreError("error.consumption.attributes.predecessorDoesNotExist", "The predecessor does not exist.");
    }

    public successionMustNotChangeOwner() {
        return new CoreError(
            "error.consumption.attributes.successionMustNotChangeOwner",
            "The successor attribute's owner does not match that of the predecessor. An attribute succession must not change the attribute's owner."
        );
    }

    public successionMustNotChangeValueType() {
        return new CoreError(
            "error.consumption.attributes.successionMustNotChangeValueType",
            "The successor attribute's value type does not match that of the predecessor. An attribute succession must not change the attribute's value type."
        );
    }

    public successionMustNotChangeContentType() {
        return new CoreError(
            "error.consumption.attributes.successionMustNotChangeContentType",
            "The successor attribute's content type does not match that of the predecessor. An attribute succession must not change the attribute's content type, i.e. an identity attribute must not be succeeded by a relationship attribute and v.v."
        );
    }

    public successionMustNotChangePeer(comment?: string) {
        let errorMessage = "The peer of the shared attribute must not change.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.successionMustNotChangePeer", errorMessage);
    }

    public cannotSucceedAttributesWithASuccessor(successorId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedAttributesWithASuccessor",
            `The attribute you want to succeed has a successor (id: ${successorId}). You cannot succeed attributes with a successor. Instead, succeed the successor.`
        );
    }

    public invalidParentSuccessor(parentSuccessorId: string | CoreId) {
        return new CoreError("error.consumption.attributes.invalidParentSuccessor", `The complex parent successor (id: ${parentSuccessorId}) does not exist.`);
    }

    public cannotSucceedAttributesWithDeletionInfo() {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedAttributesWithDeletionInfo",
            "You cannot succeed attributes with a deletionInfo, since the peer may have already deleted it or marked it for deletion."
        );
    }

    public cannotSetDeletionInfoOfRepositoryAttributes() {
        return new CoreError(
            "error.consumption.attributes.cannotSetDeletionInfoOfRepositoryAttributes",
            "RepositoryAttributes may not have a deletionInfo, since they don't have a peer and you can delete them directly."
        );
    }

    public invalidDeletionInfoOfOwnSharedAttribute() {
        return new CoreError(
            "error.consumption.attributes.invalidDeletionInfoOfOwnSharedAttribute",
            "The deletionStatus 'DeletedByOwner' and 'ToBeDeleted' can only be set for peer shared Attributes."
        );
    }

    public invalidDeletionInfoOfPeerSharedAttribute() {
        return new CoreError(
            "error.consumption.attributes.invalidDeletionInfoOfPeerSharedAttribute",
            "The deletionStatus 'DeletedByPeer' and 'ToBeDeletedByPeer' can only be set for own shared Attributes."
        );
    }

    public invalidPropertyValue(message: string) {
        return new CoreError("error.consumption.attributes.invalidPropertyValue", message);
    }

    public isNotOwnSharedAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotOwnSharedAttribute", `The attribute (id: ${attributeId}) is not an own shared attribute.`);
    }

    public isNotPeerSharedAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotPeerSharedAttribute", `The attribute (id: ${attributeId}) is not a peer shared attribute.`);
    }

    public senderIsNotPeerOfSharedAttribute(senderId: string | CoreAddress, attributeId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.senderIsNotPeerOfSharedAttribute",
            `The sender (id: ${senderId}) is not the peer you shared the attribute (id: ${attributeId}) with.`
        );
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

    private static readonly _decideValidation = class {
        public invalidNumberOfItems(message: string) {
            return new ApplicationError("error.consumption.requests.decide.validation.invalidNumberOfItems", message);
        }

        public itemAcceptedButParentNotAccepted(message: string): ApplicationError {
            return new ApplicationError("error.consumption.requests.decide.validation.itemAcceptedButParentNotAccepted", message);
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

export class CoreErrors {
    public static attributes = new Attributes();
    public static requests = new Requests();
}
