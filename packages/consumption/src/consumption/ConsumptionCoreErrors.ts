import { ApplicationError } from "@js-soft/ts-utils";
import { CoreAddress, CoreError, CoreId } from "@nmshd/core-types";

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
            "The predecessor RelationshipAttribute's key does not match that of the successor. The succession of a RelationshipAttribute must not change the key."
        );
    }

    public successionPeerIsNotOwner() {
        return new CoreError("error.consumption.attributes.successionPeerIsNotOwner", "The peer of the succeeded Attribute is not its owner. This may be an attempt of spoofing.");
    }

    public predecessorSourceAttributeIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.predecessorSourceAttributeIsNotRepositoryAttribute", "Predecessor sourceAttribute is not a RepositoryAttribute.");
    }

    public successorSourceAttributeIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.successorSourceAttributeIsNotRepositoryAttribute", "Successor sourceAttribute is not a RepositoryAttribute.");
    }

    public successorSourceDoesNotSucceedPredecessorSource() {
        return new CoreError(
            "error.consumption.attributes.successorSourceDoesNotSucceedPredecessorSource",
            "Predecessor sourceAttribute is not succeeded by successor sourceAttribute."
        );
    }

    public predecessorSourceContentIsNotEqualToCopyContent() {
        return new CoreError(
            "error.consumption.attributes.predecessorSourceContentIsNotEqualToCopyContent",
            "Predecessor sourceAttribute content doesn't match the content of the predecessor shared Attribute copy."
        );
    }

    public successorSourceContentIsNotEqualToCopyContent() {
        return new CoreError(
            "error.consumption.attributes.successorSourceContentIsNotEqualToCopyContent",
            "Successor sourceAttribute content doesn't match the content of the successor shared Attribute copy."
        );
    }

    public cannotSucceedChildOfComplexAttribute(parentId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedChildOfComplexAttribute",
            `The Attribute you want to succeed is a child Attribute of a complex Attribute (id: '${parentId}'), and cannot be succeeded on its own. Instead, succeed the parent which will implicitly succeed all its children.`
        );
    }

    public successorMustNotYetExist() {
        return new CoreError(
            "error.consumption.attributes.successorMustNotYetExist",
            "The predecessor Attribute's successor must not exist. It will be created by the succession handlers and must not be created manually."
        );
    }

    public successorMustNotHaveASuccessor(comment?: string) {
        let errorMessage = "The successor must not have a successor itself.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.successorMustNotHaveASuccessor", errorMessage);
    }

    public predecessorIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotRepositoryAttribute", "Predecessor is not a RepositoryAttribute.");
    }

    public predecessorIsNotOwnSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotOwnSharedIdentityAttribute", "Predecessor is not an own shared IdentityAttribute.");
    }

    public predecessorIsNotPeerSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotPeerSharedIdentityAttribute", "Predecessor is not a peer shared IdentityAttribute.");
    }

    public predecessorIsNotOwnSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotOwnSharedRelationshipAttribute", "Predecessor is not an own shared RelationshipAttribute.");
    }

    public predecessorIsNotPeerSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotPeerSharedRelationshipAttribute", "Predecessor is not a peer shared RelationshipAttribute.");
    }

    public predecessorIsNotThirdPartyRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.predecessorIsNotThirdPartyRelationshipAttribute", "Predecessor is not a ThirdPartyRelationshipAttribute.");
    }

    public successorIsNotRepositoryAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotRepositoryAttribute", "Successor is not a RepositoryAttribute.");
    }

    public successorIsNotOwnSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotOwnSharedIdentityAttribute", "Successor is not an own shared IdentityAttribute.");
    }

    public successorIsNotPeerSharedIdentityAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotPeerSharedIdentityAttribute", "Successor is not a peer shared IdentityAttribute.");
    }

    public successorIsNotOwnSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotOwnSharedRelationshipAttribute", "Successor is not an own shared RelationshipAttribute.");
    }

    public successorIsNotPeerSharedRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotPeerSharedRelationshipAttribute", "Successor is not a peer shared RelationshipAttribute.");
    }

    public successorIsNotThirdPartyRelationshipAttribute() {
        return new CoreError("error.consumption.attributes.successorIsNotThirdPartyRelationshipAttribute", "Successor is not a ThirdPartyRelationshipAttribute.");
    }

    public setPredecessorIdDoesNotMatchActualPredecessorId() {
        return new CoreError(
            "error.consumption.attributes.setPredecessorIdDoesNotMatchActualPredecessorId",
            "The predecessor's ID and the explicitly set value for the successor's succeeds field don't match."
        );
    }

    public predecessorDoesNotExist() {
        return new CoreError("error.consumption.attributes.predecessorDoesNotExist", "The predecessor does not exist.");
    }

    public successorDoesNotExist() {
        return new CoreError("error.consumption.attributes.successorDoesNotExist", "The successor does not exist.");
    }

    public successorSourceAttributeIsNotSpecified() {
        return new CoreError("error.consumption.attributes.successorSourceAttributeIsNotSpecified", "You must specify the sourceAttribute of the successor.");
    }

    public successorSourceAttributeDoesNotExist() {
        return new CoreError("error.consumption.attributes.successorSourceAttributeDoesNotExist", "The successor sourceAttribute does not exist.");
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

    public successionMustNotChangePeer(comment?: string) {
        let errorMessage = "The peer of the shared Attribute must not change.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.successionMustNotChangePeer", errorMessage);
    }

    public successionMustNotChangeThirdParty(comment?: string) {
        let errorMessage = "The thirdPartyAddress of the shared Attribute must not change.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.successionMustNotChangeThirdParty", errorMessage);
    }

    public cannotSucceedAttributesWithASuccessor(successorId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedAttributesWithASuccessor",
            `The Attribute you want to succeed has a successor (id: ${successorId}). You cannot succeed Attributes with a successor. Instead, succeed the successor.`
        );
    }

    public invalidParentSuccessor(parentSuccessorId: string | CoreId) {
        return new CoreError("error.consumption.attributes.invalidParentSuccessor", `The complex parent successor (id: '${parentSuccessorId}') does not exist.`);
    }

    public cannotSucceedAttributesWithDeletionInfo() {
        return new CoreError(
            "error.consumption.attributes.cannotSucceedAttributesWithDeletionInfo",
            "You cannot succeed Attributes with a deletionInfo, since the peer may have already deleted it or marked it for deletion."
        );
    }

    public cannotSetDeletionInfoOfRepositoryAttributes() {
        return new CoreError(
            "error.consumption.attributes.cannotSetDeletionInfoOfRepositoryAttributes",
            "RepositoryAttributes can not have a deletionInfo, since they are not shared with a peer and you can delete them directly."
        );
    }

    public invalidDeletionInfoOfOwnSharedAttribute() {
        return new CoreError(
            "error.consumption.attributes.invalidDeletionInfoOfOwnSharedAttribute",
            "The only valid deletionStatuses for own shared Attributes are 'DeletionRequestSent', 'DeletionRequestRejected', 'DeletedByPeer' or 'ToBeDeletedByPeer'."
        );
    }

    public invalidDeletionInfoOfPeerSharedAttribute() {
        return new CoreError(
            "error.consumption.attributes.invalidDeletionInfoOfPeerSharedAttribute",
            "The only valid deletionStatuses for peer shared Attributes are 'DeletedByOwner' or 'ToBeDeleted'."
        );
    }

    public invalidDeletionInfoOfThirdPartyRelationshipAttribute() {
        return new CoreError(
            "error.consumption.attributes.invalidDeletionInfoOfThirdPartyRelationshipAttribute",
            "The only valid deletionStatus for ThirdPartyRelationshipAttributes is 'DeletedByPeer'."
        );
    }

    public wrongOwnerOfRepositoryAttribute() {
        return new CoreError(
            "error.consumption.attributes.wrongOwnerOfRepositoryAttribute",
            "A wrong owner was provided wanting to create a RepositoryAttribute. You can only create RepositoryAttributes for yourself."
        );
    }

    public isNotRepositoryAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotRepositoryAttribute", `The Attribute (id: ${attributeId}) is not a RepositoryAttribute.`);
    }

    public isNotSharedAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotSharedAttribute", `The Attribute (id: '${attributeId}') is not a shared Attribute.`);
    }

    public isNotOwnSharedAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotOwnSharedAttribute", `The Attribute (id: '${attributeId}') is not an own shared Attribute.`);
    }

    public isNotPeerSharedAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotPeerSharedAttribute", `The Attribute (id: '${attributeId}') is not a peer shared Attribute.`);
    }

    public isNotThirdPartyRelationshipAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotThirdPartyRelationshipAttribute", `The Attribute (id: '${attributeId}') is not a ThirdPartyRelationshipAttribute.`);
    }

    public senderIsNotPeerOfSharedAttribute(senderId: string | CoreAddress, attributeId: string | CoreId) {
        return new CoreError(
            "error.consumption.attributes.senderIsNotPeerOfSharedAttribute",
            `The sender (id: '${senderId}') of the Notification is not the peer you shared the Attribute (id: '${attributeId}') with.`
        );
    }

    public setDefaultRepositoryAttributesIsDisabled() {
        return new CoreError("error.consumption.attributes.setDefaultRepositoryAttributesIsDisabled", "Setting default RepositoryAttributes is disabled for this Account.");
    }

    public invalidTags(tags: string[]): ApplicationError {
        return new ApplicationError("error.consumption.attributes.invalidTags", `Detected invalidity of the following tags provided: '${tags.join("', '")}'.`);
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
