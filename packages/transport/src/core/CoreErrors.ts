import stringify from "json-stringify-safe";
import { RelationshipStatus } from "../modules";
import { CoreError } from "./CoreError";

class Relationships {
    public operationOnlyAllowedForPeer(message: string) {
        return new CoreError("error.transport.relationships.operationOnlyAllowedForPeer", message);
    }

    public wrongRelationshipStatus(relationshipId: string, status: RelationshipStatus) {
        return new CoreError(
            "error.transport.relationships.wrongRelationshipStatus",
            `The Relationship '${relationshipId}' has the wrong status '${status}' to run this operation.`
        );
    }

    public relationshipCurrentlyExists(status: RelationshipStatus) {
        return new CoreError(
            "error.transport.relationships.relationshipCurrentlyExists",
            `No new Relationship to the peer can be created as a Relationship in status '${status}' currently exists.`
        );
    }

    public relationshipNotYetDecomposedByPeer() {
        return new CoreError(
            "error.transport.relationships.relationshipNotYetDecomposedByPeer",
            "No new Relationship can be created as the former Relationship is not yet decomposed by the peer."
        );
    }

    public reactivationNotRequested(relationshipId: string) {
        return new CoreError("error.transport.relationships.reactivationNotRequested", `The Relationship '${relationshipId}' has no reactivation Request to respond to.`);
    }

    public reactivationAlreadyRequested(message: string) {
        return new CoreError("error.transport.relationships.reactivationAlreadyRequested", message);
    }

    public activeIdentityDeletionProcessOfOwnerOfRelationshipTemplate() {
        return new CoreError(
            "error.transport.relationships.activeIdentityDeletionProcessOfOwnerOfRelationshipTemplate",
            "The Identity who created the RelationshipTemplate is currently in the process of deleting itself. Thus, it is not possible to establish a Relationship to it."
        );
    }
}

class Device {
    public alreadyOnboarded() {
        return new CoreError("error.transport.devices.alreadyOnboarded", "The device has already been onboarded.");
    }

    public couldNotDeleteDevice(reason: string, rootCause?: any) {
        return new CoreError("error.transport.devices.couldNotDeleteDevice", `Could not delete device: '${reason}'`, rootCause);
    }
}

class Messages {
    public plaintextMismatch(ownAddress: string) {
        return new CoreError(
            "error.transport.messages.plaintextMismatch",
            `The own address '${ownAddress}' was not named as a recipient within the signed MessagePlaintext. A replay attack might be the cause of this.`
        );
    }

    public signatureListMismatch(address: string) {
        return new CoreError("error.transport.messages.signatureListMismatch", `The signature list didn't contain an entry for address '${address}'.`);
    }

    public signatureNotValid() {
        return new CoreError(
            "error.transport.messages.signatureNotValid",
            "The digital signature on this Message for peer key is invalid. An impersonation attack might be the cause of this."
        );
    }

    public ownAddressNotInList(messageId: string) {
        return new CoreError(
            "error.transport.messages.ownAddressNotInList",
            `The recipients list of Message ${messageId} didn't contain an entry for the own address. This Message should not have been received.`
        );
    }

    public missingOrInactiveRelationship(address: string) {
        return new CoreError("error.transport.messages.missingOrInactiveRelationship", `An active Relationship with the given address '${address}' does not exist.`);
    }
}

class Secrets {
    public wrongSecretType(secretId?: string) {
        return new CoreError("error.transport.secrets.wrongSecretType", "The given secret type is not supported!", {
            secretId: secretId
        });
    }

    public secretNotFound(type: string) {
        return new CoreError("error.transport.secrets.secretNotFound", `Secret '${type}' not found.`);
    }
}

class Challenges {
    public challengeTypeRequiresActiveRelationship() {
        return new CoreError("error.transport.challenges.challengeTypeRequiresActiveRelationship", "The challenge type Relationship requires an active Relationship.");
    }
}

class Datawallet {
    public unsupportedModification(type: "unsupportedCacheChangedModificationCollection", data: any) {
        const errorCode = "error.transport.datawallet.unsupportedModification";
        const formattedData = data ? stringify(data) : "";

        switch (type) {
            case "unsupportedCacheChangedModificationCollection":
                return new CoreError(
                    errorCode,
                    `The following collections were received in CacheChanged datawallet modifications but are not supported by the current version of this library: '${formattedData}'.`
                );

            default:
                throw new Error(`Given type '${type}' is not supported.`);
        }
    }

    public insufficientSupportedDatawalletVersion(supportedVersion: number, requiredVersion: number) {
        return new CoreError(
            "error.transport.datawallet.insufficientSupportedDatawalletVersion",
            `The SupportedDatawalletVersion '${supportedVersion}' is too low. A minimum version of '${requiredVersion}' is required.`
        );
    }

    public currentBiggerThanTarget(current: number, target: number) {
        return new CoreError("error.transport.datawallet.currentBiggerThanTarget", `The current datawallet version '${current}' is bigger than the target version '${target}'.`);
    }
}

class Files {
    public plaintextHashMismatch() {
        return new CoreError(
            "error.transport.files.plaintextHashMismatch",
            "The actual hash of the plaintext does not match the given plaintextHash. Something went wrong while encrypting/decrypting the file."
        );
    }

    public cipherMismatch() {
        return new CoreError(
            "error.transport.files.cipherMismatch",
            "The actual hash of the cipher does not match the given cipherHash. Something went wrong while storing/transmitting the file."
        );
    }

    public invalidMetadata(id: string) {
        return new CoreError("error.transport.files.invalidMetadata", `The metadata of the File with id '${id}' is invalid.`);
    }

    public maxFileSizeExceeded(fileSize: number, platformMaxFileSize: number) {
        return new CoreError(
            "error.transport.files.maxFileSizeExceeded",
            `The given File content size (${fileSize}) exceeds the max File size the Backbone accepts (${platformMaxFileSize}).`
        );
    }
}

class Tokens {
    public invalidTokenContent(id: string) {
        return new CoreError("error.transport.tokens.invalidTokenContent", `The content of Token '${id}' is not of type TokenContent.`);
    }
}

class General {
    public baseUrlNotSet() {
        return new CoreError("error.transport.general.baseUrlNotSet", "The baseUrl was not set.");
    }

    public platformClientSecretNotSet() {
        return new CoreError("error.transport.general.platformClientSecretNotSet", "The platform clientSecret was not set.");
    }

    public platformClientIdNotSet() {
        return new CoreError("error.transport.general.platformClientIdNotSet", "The platform clientId was not set.");
    }

    public platformClientInvalid() {
        return new CoreError("error.transport.general.platformClientInvalid", "The combination of platform clientId and clientSecret is invalid.");
    }

    public signatureNotValid(type?: string) {
        return new CoreError("error.transport.signatureNotValid", `The ${type ? `${type}-` : ""}signature is not valid.`);
    }

    public recordNotFound(entityName: string | Function, entityId: string) {
        return new CoreError("error.transport.recordNotFound", `'${entityName instanceof Function ? entityName.name : entityName}' not found.`, entityId);
    }

    public notSupported() {
        return new CoreError("error.transport.notSupported", "The method is not yet supported.");
    }

    public invalidTruncatedReference() {
        return new CoreError("error.transport.files.invalidTruncatedReference", "invalid truncated reference");
    }
}

export class CoreErrors {
    public static readonly relationships = new Relationships();
    public static readonly general = new General();
    public static readonly messages = new Messages();
    public static readonly secrets = new Secrets();
    public static readonly device = new Device();
    public static readonly files = new Files();
    public static readonly challenges = new Challenges();
    public static readonly datawallet = new Datawallet();
    public static readonly tokens = new Tokens();
}
