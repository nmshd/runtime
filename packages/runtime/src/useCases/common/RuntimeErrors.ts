import { ApplicationError } from "@js-soft/ts-utils";
import { LocalAttribute } from "@nmshd/consumption";
import { CoreAddress, CoreId } from "@nmshd/core-types";

class General {
    public unknown(message: string, data?: any) {
        return new ApplicationError("error.runtime.unknown", message, data);
    }

    public alreadyInitialized() {
        return new ApplicationError("error.runtime.alreadyInitialized", "The Runtime is already initialized. The init method can only be executed once.");
    }

    public notInitialized() {
        return new ApplicationError("error.runtime.notInitialized", "The Runtime is not initialized. You must run init before you can start or stop the Runtime.");
    }

    public alreadyStarted() {
        return new ApplicationError("error.runtime.alreadyStarted", "The Runtime is already started. You should stop it first for a restart.");
    }

    public notStarted() {
        return new ApplicationError("error.runtime.notStarted", "The Runtime is not started. You can only stop the Runtime if you executed start before.");
    }

    public recordNotFound(entityName?: string | Function): ApplicationError {
        return this.recordNotFoundWithMessage(`${entityName instanceof Function ? entityName.name : entityName} not found. Make sure the ID exists and the record is not expired.`);
    }

    public recordNotFoundWithMessage(message: string): ApplicationError {
        return new ApplicationError("error.runtime.recordNotFound", message);
    }

    public invalidPropertyValue(message: string): ApplicationError {
        return new ApplicationError("error.runtime.validation.invalidPropertyValue", message);
    }

    public invalidPayload(message?: string): ApplicationError {
        return new ApplicationError("error.runtime.validation.invalidPayload", message ?? "The given combination of properties in the payload is not supported.");
    }

    public notSupported(message: string) {
        return new ApplicationError("error.runtime.notSupported", message);
    }

    public invalidTokenContent() {
        return new ApplicationError("error.runtime.invalidTokenContent", "The given Token has an invalid content for this route.");
    }

    public invalidReference(): ApplicationError {
        return new ApplicationError("error.runtime.invalidReference", "The given reference is invalid for performing the requested action.");
    }
}

class Serval {
    public unknownType(message: string) {
        return new ApplicationError("error.runtime.unknownType", message);
    }

    public general(message: string) {
        return new ApplicationError("error.runtime.servalError", message);
    }

    public requestDeserialization(message: string) {
        return new ApplicationError("error.runtime.requestDeserialization", message);
    }
}

class Files {
    public notOwnedByYou(): ApplicationError {
        return new ApplicationError("error.runtime.files.notOwnedByYou", "Only the owner of the File can perform this action.");
    }
}

class RelationshipTemplates {
    public personalizationMustBeInherited(): ApplicationError {
        return new ApplicationError(
            "error.runtime.relationshipTemplates.personalizationMustBeInherited",
            "If a RelationshipTemplate is personalized, Tokens created from it must have the same personalization."
        );
    }

    public passwordProtectionMustBeInherited(): ApplicationError {
        return new ApplicationError(
            "error.runtime.relationshipTemplates.passwordProtectionMustBeInherited",
            "If a RelationshipTemplate has password protection, Tokens created from it must have the same password protection."
        );
    }

    public cannotCreateTokenForPeerTemplate(): ApplicationError {
        return new ApplicationError("error.runtime.relationshipTemplates.cannotCreateTokenForPeerTemplate", "You cannot create a Token for a peer RelationshipTemplate.");
    }

    public requestCannotExpireAfterRelationshipTemplate(): ApplicationError {
        return new ApplicationError(
            "error.runtime.relationshipTemplates.requestCannotExpireAfterRelationshipTemplate",
            "The expiration date of the Request within the onNewRelationship property of the RelationshipTemplateContent must be set such that the expiration date of the RelationshipTemplate is not exceeded."
        );
    }
}

class Relationships {
    public isNeitherRejectedNorRevoked(): ApplicationError {
        return new ApplicationError("error.runtime.relationships.isNeitherRejectedNorRevoked", "The status of the Relationship is neither 'Rejected' nor 'Revoked'.");
    }

    public noAcceptedIncomingRequest(): ApplicationError {
        return new ApplicationError(
            "error.runtime.relationships.noAcceptedIncomingRequest",
            "There is no accepted incoming Request associated with the RelationshipTemplateContent of the RelationshipTemplate."
        );
    }

    public wrongResponseProvidedAsCreationContent(): ApplicationError {
        return new ApplicationError(
            "error.runtime.relationships.wrongResponseProvidedAsCreationContent",
            "The Response of the accepted incoming Request associated with the RelationshipTemplateContent must be provided as the response of the RelationshipCreationContent."
        );
    }
}

class Messages {
    public hasNoActiveRelationship(addresses: string[]) {
        return new ApplicationError(
            "error.runtime.messages.hasNoActiveRelationship",
            `The Message cannot be sent as there is no active Relationship to the recipient(s) with the following address(es): ${addresses.map((address) => `'${address}'`).join(", ")}. However, please note that Messages whose content is a Notification can be sent on terminated Relationships as well.`
        );
    }

    public cannotSendMessageWithExpiredRequest() {
        return new ApplicationError(
            "error.runtime.messages.cannotSendMessageWithExpiredRequest",
            "The Message cannot be sent as the contained Request is already expired. Please create a new Request and try again."
        );
    }

    public cannotSendRequestThatWasAlreadySent() {
        return new ApplicationError(
            "error.runtime.messages.cannotSendRequestThatWasAlreadySent",
            "The Message cannot be sent as the contained Request has already been sent. Please create a new Request and try again."
        );
    }

    public peerIsInDeletion(addresses: string[]) {
        return new ApplicationError(
            "error.runtime.messages.peerIsInDeletion",
            `The Message cannot be sent as the recipient(s) with the following address(es) being in deletion: ${addresses.map((address) => `'${address}'`).join(", ")}. However, please note that Messages whose content is a Notification can be sent to recipients in deletion.`
        );
    }

    public fileNotFoundInMessage(attachmentId: string) {
        return new ApplicationError("error.runtime.messages.fileNotFoundInMessage", `The requested File '${attachmentId}' was not found in the given Message.`);
    }
}

class Startup {
    public noActiveAccount(): ApplicationError {
        return new ApplicationError("error.runtime.startup.noActiveAccount", "No AccountController could be found. You might have to login first.");
    }

    public noActiveConsumptionController(): ApplicationError {
        return new ApplicationError("error.runtime.startup.noActiveConsumptionController", "No ConsumptionController could be found. You might have to login first.");
    }

    public noActiveExpander(): ApplicationError {
        return new ApplicationError("error.runtime.startup.noActiveExpander", "No DataViewExpander could be found. You might have to login first.");
    }
}

class Challenges {
    public invalidSignature(): ApplicationError {
        return new ApplicationError("error.runtime.challenges.invalidSignature", "The signature is invalid.");
    }

    public invalidChallengeString(): ApplicationError {
        return new ApplicationError("error.runtime.challenges.invalidChallengeString", "The challengeString is invalid.");
    }
}

class Notifications {
    public cannotReceiveNotificationFromOwnMessage(): ApplicationError {
        return new ApplicationError("error.runtime.notifications.cannotReceiveNotificationFromOwnMessage", "Cannot receive Notification from own Message.");
    }

    public cannotSaveSentNotificationFromPeerMessage(messageId: CoreId): ApplicationError {
        return new ApplicationError(
            "error.runtime.notifications.cannotSaveSentNotificationFromPeerMessage",
            `The Message '${messageId}' was received from a peer, but an own Message is expected here to save its Notification content.`
        );
    }

    public messageDoesNotContainNotification(messageId: CoreId): ApplicationError {
        return new ApplicationError(
            "error.runtime.notifications.messageDoesNotContainNotification",
            `The Message with the ID '${messageId.toString()}' does not contain a Notification.`
        );
    }
}

class Attributes {
    public isNotOwnIdentityAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError("error.runtime.attributes.isNotOwnIdentityAttribute", `The Attribute '${attributeId.toString()}' is not an OwnIdentityAttribute.`);
    }

    public ownIdentityAttributeHasAlreadyBeenSharedWithPeer(attributeId: CoreId | string, peer: CoreAddress | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.ownIdentityAttributeHasAlreadyBeenSharedWithPeer",
            `The OwnIdentityAttribute '${attributeId.toString()}' has already been shared with peer '${peer.toString()}'.'.`
        );
    }

    public successorOfOwnIdentityAttributeHasAlreadyBeenSharedWithPeer(attributeId: CoreId | string, successorId: CoreId | string, peer: CoreAddress | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.successorOfOwnIdentityAttributeHasAlreadyBeenSharedWithPeer",
            `A successor '${successorId.toString()}' of the OwnIdentityAttribute '${attributeId.toString()}' has already been shared with peer '${peer.toString()}'.'.`
        );
    }

    public peerHasNoPreviousVersionOfAttribute(attributeId: CoreId | string, peer: CoreAddress | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.peerHasNoPreviousVersionOfAttribute",
            `The peer '${peer.toString()}' doesn't have any previous version of the Attribute '${attributeId.toString()}'. Either you haven't shared it before or the peer has deleted it.`
        );
    }

    public isNotOwnRelationshipAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError("error.runtime.attributes.isNotOwnRelationshipAttribute", `The Attribute '${attributeId.toString()}' is not an OwnRelationshipAttribute.`);
    }

    public hasSuccessor(predecessor: LocalAttribute): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.hasSuccessor",
            `Attribute '${predecessor.id.toString()}' already has a successor ${predecessor.succeededBy?.toString()}.`
        );
    }

    public cannotCreateDuplicateOwnIdentityAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute",
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${attributeId.toString()}'.`
        );
    }

    public setDefaultOwnIdentityAttributesIsDisabled(): ApplicationError {
        return new ApplicationError("error.runtime.attributes.setDefaultOwnIdentityAttributesIsDisabled", "Setting default OwnIdentityAttributes is disabled for this Account.");
    }

    public cannotDeleteSharedAttributeWhileRelationshipIsPending(): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending",
            "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'. If you want to delete it now, you'll have to revoke the pending Relationship."
        );
    }
}

class IdentityDeletionProcess {
    public noActiveIdentityDeletionProcess() {
        return new ApplicationError("error.runtime.identityDeletionProcess.noActiveIdentityDeletionProcess", "No active IdentityDeletionProcess found.");
    }

    public noWaitingForApprovalIdentityDeletionProcess() {
        return new ApplicationError("error.runtime.identityDeletionProcess.noWaitingForApprovalIdentityDeletionProcess", "No IdentityDeletionProcess waiting for decision found.");
    }

    public noApprovedIdentityDeletionProcess() {
        return new ApplicationError("error.runtime.identityDeletionProcess.noApprovedIdentityDeletionProcess", "No approved IdentityDeletionProcess found.");
    }

    public activeIdentityDeletionProcessAlreadyExists() {
        return new ApplicationError(
            "error.runtime.identityDeletionProcess.activeIdentityDeletionProcessAlreadyExists",
            "There is already an active IdentityDeletionProcess. You cannot start another, as there may only be one active IdentityDeletionProcess per Identity."
        );
    }
}

class IdentityMetadata {
    public notFound() {
        return new ApplicationError("error.runtime.identityMetadata.notFound", "There is no stored IdentityMetadata for the specified combination of reference and key.");
    }

    public unfamiliarReferencedIdentity() {
        return new ApplicationError(
            "error.runtime.identityMetadata.unfamiliarReferencedIdentity",
            "The reference of the IdentityMetadata resolves neither to the address of a peer of a Relationship nor the address of the own Identity."
        );
    }
}

class IdentityRecoveryKits {
    public datawalletDisabled() {
        return new ApplicationError(
            "error.runtime.identityRecoveryKits.datawalletDisabled",
            "The Datawallet is disabled. IdentityRecoveryKits will only work if the Datawallet is enabled."
        );
    }
}

class DeciderModule {
    public requestConfigDoesNotMatchResponseConfig() {
        return new ApplicationError("error.runtime.decide.requestConfigDoesNotMatchResponseConfig", "The RequestConfig does not match the ResponseConfig.");
    }
}

class Devices {
    public referenceNotPointingToAnEmptyToken() {
        return new ApplicationError("error.runtime.devices.referenceNotPointingToAnEmptyToken", "The given reference is not pointing to an empty token.");
    }
}

export class RuntimeErrors {
    public static readonly general = new General();
    public static readonly serval = new Serval();
    public static readonly startup = new Startup();
    public static readonly files = new Files();
    public static readonly relationshipTemplates = new RelationshipTemplates();
    public static readonly relationships = new Relationships();
    public static readonly messages = new Messages();
    public static readonly challenges = new Challenges();
    public static readonly notifications = new Notifications();
    public static readonly attributes = new Attributes();
    public static readonly identityDeletionProcess = new IdentityDeletionProcess();
    public static readonly identityMetadata = new IdentityMetadata();
    public static readonly identityRecoveryKits = new IdentityRecoveryKits();
    public static readonly deciderModule = new DeciderModule();
    public static readonly devices = new Devices();
}
