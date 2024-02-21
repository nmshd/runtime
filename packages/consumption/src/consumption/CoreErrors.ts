import { ApplicationError } from "@js-soft/ts-utils";
import { CoreAddress, CoreError, CoreId } from "@nmshd/transport";

class Attributes {
    public genericValidationError(error: any) {
        return new CoreError(
            "error.consumption.attributes.genericValidationError",
            "Validation failed during creation of object.",
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

    public invalidSuccessionOfOwnSharedIdentityAttribute(comment?: string) {
        let errorMessage = "Invalid succession of own shared identity attribute.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.invalidSuccessionOfOwnSharedIdentityAttribute", errorMessage);
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

    public invalidPredecessor(comment?: string) {
        let errorMessage = "Invalid predecessor.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.invalidPredecessor", errorMessage);
    }

    public invalidSuccessor(comment?: string) {
        let errorMessage = "Invalid successor.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError("error.consumption.attributes.invalidSuccessor", errorMessage);
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

    public invalidPropertyValue(message: string) {
        return new CoreError("error.consumption.attributes.invalidPropertyValue", message);
    }

    public isNotOwnSharedAttribute(attributeId: string | CoreId) {
        return new CoreError("error.consumption.attributes.isNotOwnSharedAttribute", `The attribute (id: ${attributeId}) is not an own shared attribute.`);
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

    public invalidAcceptParameters(): ApplicationError {
        return new ApplicationError("error.consumption.requests.canAccept.invalidAcceptParameters", "The RequestItem was answered with incorrect parameters.");
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
