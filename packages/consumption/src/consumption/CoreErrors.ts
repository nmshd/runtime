import { ApplicationError } from "@js-soft/ts-utils";
import { CoreError, CoreId } from "@nmshd/transport";

class Attributes {
    private static readonly prefix = "error.consumption.attributes.";
    public genericValidationError(error: any) {
        return new CoreError(
            `${Attributes.prefix}${this.genericValidationError.name}`,
            "Validation failed during creation of object.",
            error,
            undefined,
            error instanceof Error ? error : undefined
        );
    }

    public successionMustNotChangeKey() {
        return new CoreError(
            `${Attributes.prefix}${this.successionMustNotChangeKey.name}`,
            "The predecessor attribute's key does not match that of the successor. The succession of a relationship attribute must not change the key."
        );
    }

    public successionPeerIsNotOwner() {
        return new CoreError(
            `${Attributes.prefix}${this.successionPeerIsNotOwner.name}`,
            "The peer of the succeeded attribute is not its owner. This may be an attempt of spoofing."
        );
    }

    public invalidSuccessionOfOwnSharedIdentityAttribute(comment?: string) {
        let errorMessage = "Invalid succession of own shared identity attribute.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError(`${Attributes.prefix}${this.invalidSuccessionOfOwnSharedIdentityAttribute.name}`, errorMessage);
    }

    public cannotSucceedPartOfComplexAttribute(parentId: string | CoreId) {
        return new CoreError(
            `${Attributes.prefix}${this.cannotSucceedPartOfComplexAttribute.name}`,
            `The attribute you want to succeed is part of a complex attribute (id: ${parentId}), and cannot be succeeded on its own. Instead, succeed the parent which will implicitly succeed all its children.`
        );
    }

    public successorMustNotYetExist() {
        return new CoreError(
            `${Attributes.prefix}${this.successorMustNotYetExist.name}`,
            "The predecessor attribute's successor must not exist. It will be created by the succession handlers and must not be created manually."
        );
    }

    public successorMustNotHaveASuccessor(comment?: string) {
        let errorMessage = "The successor must not have a successor itself.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError(`${Attributes.prefix}${this.successorMustNotHaveASuccessor.name}`, errorMessage);
    }

    public invalidPredecessor(comment?: string) {
        let errorMessage = "Invalid predecessor.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError(`${Attributes.prefix}${this.invalidPredecessor.name}`, errorMessage);
    }

    public invalidSuccessor(comment?: string) {
        let errorMessage = "Invalid successor.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError(`${Attributes.prefix}${this.invalidSuccessor.name}`, errorMessage);
    }

    public predecessorDoesNotExist() {
        return new CoreError(`${Attributes.prefix}${this.predecessorDoesNotExist.name}`, "The predecessor does not exist.");
    }

    public successionMustNotChangeOwner() {
        return new CoreError(
            `${Attributes.prefix}${this.successionMustNotChangeOwner.name}`,
            "The successor attribute's owner does not match that of the predecessor. An attribute succession must not change the attribute's owner."
        );
    }

    public successionMustNotChangeValueType() {
        return new CoreError(
            `${Attributes.prefix}${this.successionMustNotChangeValueType.name}`,
            "The successor attribute's value type does not match that of the predecessor. An attribute succession must not change the attribute's value type."
        );
    }

    public successionMustNotChangeContentType() {
        return new CoreError(
            `${Attributes.prefix}${this.successionMustNotChangeContentType.name}`,
            "The successor attribute's content type does not match that of the predecessor. An attribute succession must not change the attribute's content type, i.e. an identity attribute must not be succeeded by a relationship attribute and v.v."
        );
    }

    public successionMustNotChangePeer(comment?: string) {
        let errorMessage = "The peer of the shared attribute must not change.";
        if (comment) errorMessage += ` ${comment}`;
        return new CoreError(`${Attributes.prefix}${this.successionMustNotChangePeer.name}`, errorMessage);
    }

    public cannotSucceedAttributesWithASuccessor(successorId: string | CoreId) {
        return new CoreError(
            `${Attributes.prefix}${this.cannotSucceedAttributesWithASuccessor.name}`,
            `The Attribute you want to succeed has a successor (id: ${successorId}). You cannot succeed Attributes with a successor. Instead, succeed the successor.`
        );
    }

    public invalidPropertyValue(message: string) {
        return new CoreError(`${Attributes.prefix}${this.invalidPropertyValue.name}`, message);
    }
}

class Requests {
    private static readonly prefix = "error.consumption.requests.";
    public unexpectedErrorDuringRequestItemProcessing(error: any) {
        return new CoreError(
            `${Requests.prefix}${this.unexpectedErrorDuringRequestItemProcessing.name}`,
            error instanceof Error ? error.message : `Unknown error: '${JSON.stringify(error)}'`,
            undefined,
            undefined,
            error
        );
    }

    public servalErrorDuringRequestItemProcessing(error: any) {
        return new CoreError(
            `${Requests.prefix}${this.servalErrorDuringRequestItemProcessing.name}`,
            error instanceof Error ? error.message : `Serval error: '${JSON.stringify(error)}'`,
            undefined,
            undefined,
            error
        );
    }

    public invalidAcceptParameters(): ApplicationError {
        return new ApplicationError(`${Requests.prefix}canAccept.${this.invalidAcceptParameters.name}`, "The RequestItem was answered with incorrect parameters.");
    }

    public invalidRequestItem(message: string) {
        return new CoreError(`${Requests.prefix}${this.invalidRequestItem.name}`, message);
    }

    private static readonly _decideValidation = class {
        public invalidNumberOfItems(message: string) {
            return new ApplicationError(`${Requests.prefix}decide.validation.${this.invalidNumberOfItems.name}`, message);
        }

        public itemAcceptedButParentNotAccepted(message: string): ApplicationError {
            return new ApplicationError(`${Requests.prefix}decide.validation.${this.itemAcceptedButParentNotAccepted.name}`, message);
        }

        public mustBeAcceptedItemNotAccepted(message: string): ApplicationError {
            return new ApplicationError(`${Requests.prefix}decide.validation.${this.mustBeAcceptedItemNotAccepted.name}`, message);
        }

        public requestItemAnsweredAsRequestItemGroup(): ApplicationError {
            return new ApplicationError(
                `${Requests.prefix}decide.validation.${this.requestItemAnsweredAsRequestItemGroup.name}`,
                "The RequestItem was answered as a RequestItemGroup."
            );
        }

        public requestItemGroupAnsweredAsRequestItem(): ApplicationError {
            return new ApplicationError(
                `${Requests.prefix}decide.validation.${this.requestItemGroupAnsweredAsRequestItem.name}`,
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
