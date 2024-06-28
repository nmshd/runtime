import stringify from "json-stringify-safe";
import { RelationshipChangeStatus } from "../modules/relationships/transmission/changes/RelationshipChangeStatus";
import { CoreError } from "./CoreError";

class Relationships {
    public wrongChangeStatus(status: RelationshipChangeStatus) {
        return new CoreError("error.transport.relationships.wrongChangeStatus", `The relationship change has the wrong status (${status}) to run this operation`);
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
        return new CoreError("error.transport.devices.couldNotDeleteDevice", `Could not delete device: ${reason}`, rootCause);
    }
}

class Messages {
    public plaintextMismatch(ownAddress: string) {
        return new CoreError(
            "error.transport.messages.plaintextMismatch",
            `The own address ${ownAddress} was not named as a recipient within the signed MessagePlaintext. A replay attack might be the cause of this.`
        );
    }

    public signatureListMismatch(address: string) {
        return new CoreError("error.transport.messages.signatureListMismatch", `The signature list didn't contain an entry for address ${address}.`);
    }

    public signatureNotValid() {
        return new CoreError(
            "error.transport.messages.signatureNotValid",
            "The digital signature on this message for peer key is invalid. An impersonination attack might be the cause of this."
        );
    }

    public ownAddressNotInList(messageId: string) {
        return new CoreError(
            "error.transport.messages.ownAddressNotInList",
            `The recipients list of message ${messageId} didn't contain an entry for the own address. This message should not have been received.`
        );
    }

    public noMatchingRelationship(address: string) {
        return new CoreError("error.transport.messages.noMatchingRelationship", `A Relationship with the given address '${address}' does not exist.`);
    }
}

class Secrets {
    public wrongSecretType(secretId?: string) {
        return new CoreError("error.transport.secrets.wrongBaseKeyType", "The given secret type is not supported!", {
            secretId: secretId
        });
    }

    public secretNotFound(type: string) {
        return new CoreError("error.transport.secrets.secretNotFound", `secret "${type}" not found`);
    }
}

class Challenges {
    public challengeTypeRequiresRelationship() {
        return new CoreError("error.transport.challenges.challengeTypeRequiresRelationship", "The challenge type 'Relationship' requires a relationship.");
    }
}

class Datawallet {
    public encryptedPayloadIsNoCipher() {
        return new CoreError("error.transport.datawallet.encryptedPayloadIsNoCipher", "The given encrypted payload is no cipher.");
    }

    public unsupportedModification(type: "unsupportedCacheChangedModificationCollection", data: any) {
        const errorCode = "error.transport.datawallet.unsupportedModification";
        const formattedData = data ? stringify(data) : "";

        switch (type) {
            case "unsupportedCacheChangedModificationCollection":
                return new CoreError(
                    errorCode,
                    `The following collections were received in CacheChanged datawallet modifications but are not supported by the current version of this library: ${formattedData}.`
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
        return new CoreError("error.transport.files.invalidMetadata", `The metadata of the file with id "${id}" is invalid.`);
    }

    public fileContentUndefined() {
        return new CoreError("error.transport.files.fileContentUndefined", "The given file content is undefined.");
    }

    public maxFileSizeExceeded(fileSize: number, platformMaxFileSize: number) {
        return new CoreError(
            "error.transport.files.maxFileSizeExceeded",
            `The given file content size (${fileSize}) exceeds the max file size the backbone accepts (${platformMaxFileSize}).`
        );
    }
}

class Tokens {
    public invalidTokenContent(id: string) {
        return new CoreError("error.transport.tokens.invalidTokenContent", `The content of token ${id} is not of type TokenContent`);
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

    public realmLength() {
        return new CoreError("error.transport.identity.realmLength", "Realm must be of length 3.");
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
