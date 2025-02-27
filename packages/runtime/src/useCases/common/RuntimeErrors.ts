import { ApplicationError } from "@js-soft/ts-utils";
import { LocalAttribute } from "@nmshd/consumption";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { Base64ForIdPrefix } from "./Base64ForIdPrefix";

class General {
    public unknown(message: string, data?: any) {
        return new ApplicationError("error.runtime.unknown", message, data);
    }

    public alreadyInitialized() {
        return new ApplicationError("error.runtime.alreadyInitialized", "The runtime is already initialized. The init method can only be executed once.");
    }

    public notInitialized() {
        return new ApplicationError("error.runtime.notInitialized", "The runtime is not initialized. You must run init before you can start or stop the runtime.");
    }

    public alreadyStarted() {
        return new ApplicationError("error.runtime.alreadyStarted", "The runtime is already started. You should stop it first for a restart.");
    }

    public notStarted() {
        return new ApplicationError("error.runtime.notStarted", "The runtime is not started. You can only stop the runtime if you executed start before.");
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

    public cacheEmpty(entityName: string | Function, id: string) {
        return new ApplicationError("error.runtime.cacheEmpty", `The cache of ${entityName instanceof Function ? entityName.name : entityName} with id '${id}' is empty.`);
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
    public invalidReference(reference: string): ApplicationError {
        return new ApplicationError(
            "error.runtime.files.invalidReference",
            `The given reference '${reference}' is not valid. The reference for a File must start with '${Base64ForIdPrefix.Token}' or '${Base64ForIdPrefix.File}'.`
        );
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

    public cannotCreateQRCodeForPeerTemplate(): ApplicationError {
        return new ApplicationError("error.runtime.relationshipTemplates.cannotCreateQRCodeForPeerTemplate", "You cannot create a QR code for a peer RelationshipTemplate.");
    }

    public invalidReference(reference: string): ApplicationError {
        return new ApplicationError(
            "error.runtime.relationshipTemplates.invalidReference",
            `The given reference '${reference}' is not valid. The reference for a RelationshipTemplate must start with '${Base64ForIdPrefix.Token}' or '${Base64ForIdPrefix.RelationshipTemplate}'.`
        );
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
        return new ApplicationError("error.runtime.challenges.invalidChallenge", "The challengeString is invalid.");
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
    public isNotRepositoryAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError("error.runtime.attributes.isNotRepositoryAttribute", `Attribute '${attributeId.toString()}' is not a RepositoryAttribute.`);
    }

    public repositoryAttributeHasAlreadyBeenSharedWithPeer(
        repositoryAttributeId: CoreId | string,
        peer: CoreAddress | string,
        ownSharedIdentityAttributeId: CoreId | string
    ): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.repositoryAttributeHasAlreadyBeenSharedWithPeer",
            `RepositoryAttribute '${repositoryAttributeId.toString()}' has already been shared with peer '${peer.toString()}'. ID of own shared IdentityAttribute: '${ownSharedIdentityAttributeId.toString()}'.`
        );
    }

    public noPreviousVersionOfRepositoryAttributeHasBeenSharedWithPeerBefore(repositoryAttributeId: CoreId | string, peer: CoreAddress | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.noPreviousVersionOfRepositoryAttributeHasBeenSharedWithPeerBefore",
            `No previous version of the RepositoryAttribute '${repositoryAttributeId.toString()}' has been shared with peer '${peer.toString()}' before. If you wish to execute an initial sharing of this Attribute, use the ShareRepositoryAttributeUseCase instead.`
        );
    }

    public cannotSucceedAttributesWithDeletionInfo(ownSharedIdentityAttributeIds: CoreId[] | string[]): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.cannotSucceedAttributesWithDeletionInfo",
            `The own shared IdentityAttribute predecessor(s) ${ownSharedIdentityAttributeIds.map((ownSharedIdentityAttributeId) => `'${ownSharedIdentityAttributeId.toString()}'`).join(", ")} can't be succeeded, since they have a deletionInfo.`
        );
    }

    public isNotOwnSharedAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError("error.runtime.attributes.isNotOwnSharedAttribute", `Attribute '${attributeId.toString()}' is not an own shared Attribute.`);
    }

    public isNotPeerSharedAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError("error.runtime.attributes.isNotPeerSharedAttribute", `Attribute '${attributeId.toString()}' is not a peer shared Attribute.`);
    }

    public isNotThirdPartyRelationshipAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.isNotThirdPartyRelationshipAttribute",
            `Attribute '${attributeId.toString()}' is not a ThirdPartyRelationshipAttribute.`
        );
    }

    public hasSuccessor(predecessor: LocalAttribute): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.hasSuccessor",
            `Attribute '${predecessor.id.toString()}' already has a successor ${predecessor.succeededBy?.toString()}.`
        );
    }

    public cannotSeparatelyDeleteChildOfComplexAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.cannotSeparatelyDeleteChildOfComplexAttribute",
            `Attribute '${attributeId.toString()}' is a child of a complex Attribute. If you want to delete it, you must delete its parent.`
        );
    }

    public cannotCreateDuplicateRepositoryAttribute(attributeId: CoreId | string): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute",
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${attributeId.toString()}'.`
        );
    }

    public setDefaultRepositoryAttributesIsDisabled(): ApplicationError {
        return new ApplicationError("error.runtime.attributes.setDefaultRepositoryAttributesIsDisabled", "Setting default RepositoryAttributes is disabled for this Account.");
    }

    public cannotDeleteSharedAttributeWhileRelationshipIsPending(): ApplicationError {
        return new ApplicationError(
            "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending",
            "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'."
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
}
