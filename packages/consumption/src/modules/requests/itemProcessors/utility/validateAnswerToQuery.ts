import {
    Consent,
    IdentityAttribute,
    IdentityAttributeQuery,
    IQLQuery,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";

export default function validateAnswerToQuery(
    query: IdentityAttributeQuery | IQLQuery | RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery,
    attribute: IdentityAttribute | RelationshipAttribute,
    recipient: CoreAddress,
    sender: CoreAddress
): ValidationResult {
    if (query instanceof IdentityAttributeQuery) {
        const result = validateAnswerToIdentityAttributeQuery(query, attribute, recipient);
        if (result.isError()) return result;
    } else if (query instanceof IQLQuery) {
        const result = validateAnswerToIQLQuery(query, attribute, recipient);
        if (result.isError()) return result;
    } else if (query instanceof RelationshipAttributeQuery) {
        const result = validateAnswerToRelationshipAttributeQuery(query, attribute, recipient);
        if (result.isError()) return result;
    } else if (query instanceof ThirdPartyRelationshipAttributeQuery) {
        const result = validateAnswerToThirdPartyRelationshipAttributeQuery(query, attribute, recipient, sender);
        if (result.isError()) return result;
    } else {
        return ValidationResult.error(CoreErrors.requests.unexpectedErrorDuringRequestItemProcessing("An unknown error occurred during the RequestItem processing."));
    }

    if (query instanceof IdentityAttributeQuery || query instanceof RelationshipAttributeQuery || query instanceof ThirdPartyRelationshipAttributeQuery) {
        if ((!query.validFrom && attribute.validFrom !== undefined) || (query.validFrom && attribute.validFrom && query.validFrom.isBefore(attribute.validFrom))) {
            return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided Attribute is not valid in the queried time frame."));
        }

        if ((!query.validTo && attribute.validTo !== undefined) || (query.validTo && attribute.validTo && query.validTo.isAfter(attribute.validTo))) {
            return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided Attribute is not valid in the queried time frame."));
        }
    }

    return ValidationResult.success();
}

function validateAnswerToIdentityAttributeQuery(query: IdentityAttributeQuery, attribute: IdentityAttribute | RelationshipAttribute, recipient: CoreAddress): ValidationResult {
    if (!(attribute instanceof IdentityAttribute)) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided Attribute is not an IdentityAttribute, but an IdentityAttribute was queried."));
    }

    const ownerIsCurrentIdentity = recipient.equals(attribute.owner);

    if (!ownerIsCurrentIdentity) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery("The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes.")
        );
    }

    if (query.valueType !== attribute.value.constructor.name) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided IdentityAttribute is not of the queried IdentityAttribute Value Type."));
    }

    if (query.tags?.length !== attribute.tags?.length) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The number of tags of the provided IdentityAttribute do not match the number of queried tags."));
    }

    if (query.tags !== undefined && attribute.tags !== undefined) {
        const sortedQueriedTags = query.tags.sort();
        const sortedAttributeTags = attribute.tags.sort();
        if (!sortedQueriedTags.every((tag, index) => tag === sortedAttributeTags[index])) {
            return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The tags of the provided IdentityAttribute do not match the queried tags."));
        }
    }

    return ValidationResult.success();
}

function validateAnswerToIQLQuery(query: IQLQuery, attribute: IdentityAttribute | RelationshipAttribute, recipient: CoreAddress): ValidationResult {
    if (!(attribute instanceof IdentityAttribute)) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery("The provided Attribute is not an IdentityAttribute. Currently, only IdentityAttributes should be queried by an IQLQuery.")
        );
    }

    const ownerIsCurrentIdentity = recipient.equals(attribute.owner);

    if (!ownerIsCurrentIdentity) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery("The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes.")
        );
    }

    if (query.attributeCreationHints !== undefined) {
        if (query.attributeCreationHints.valueType !== attribute.value.constructor.name) {
            return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided IdentityAttribute is not of the queried IdentityAttribute Value Type."));
        }

        if (query.attributeCreationHints.tags?.length !== attribute.tags?.length) {
            return ValidationResult.error(
                CoreErrors.requests.invalidlyAnsweredQuery("The number of tags of the provided IdentityAttribute do not match the number of queried tags.")
            );
        }

        if (query.attributeCreationHints.tags !== undefined && attribute.tags !== undefined) {
            const sortedQueriedTags = query.attributeCreationHints.tags.sort();
            const sortedAttributeTags = attribute.tags.sort();
            if (!sortedQueriedTags.every((tag, index) => tag === sortedAttributeTags[index])) {
                return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The tags of the provided IdentityAttribute do not match the queried tags."));
            }
        }
    }

    return ValidationResult.success();
}

function validateAnswerToRelationshipAttributeQuery(
    query: RelationshipAttributeQuery,
    attribute: IdentityAttribute | RelationshipAttribute,
    recipient: CoreAddress
): ValidationResult {
    if (!(attribute instanceof RelationshipAttribute)) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery("The provided Attribute is not a RelationshipAttribute, but a RelationshipAttribute was queried.")
        );
    }

    const ownerIsCurrentIdentity = recipient.equals(attribute.owner);
    const queriedOwnerIsEmpty = query.owner.equals("");

    if (!queriedOwnerIsEmpty && !query.owner.equals(attribute.owner)) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute does not belong to the queried owner."));
    }

    if (queriedOwnerIsEmpty && !ownerIsCurrentIdentity) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery("You are not the owner of the provided RelationshipAttribute, but an empty string was specified for the owner of the query.")
        );
    }

    if (query.key !== attribute.key) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute has not the queried key."));
    }

    if (query.attributeCreationHints.confidentiality !== attribute.confidentiality) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute has not the queried confidentiality."));
    }

    if (query.attributeCreationHints.valueType !== attribute.value.constructor.name) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute is not of the queried RelationshipAttribute Value Type."));
    }

    if (!(attribute.value instanceof Consent)) {
        if (query.attributeCreationHints.title !== attribute.value.title) {
            return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute has not the queried title."));
        }

        if (query.attributeCreationHints.description !== attribute.value.description) {
            return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute has not the queried description."));
        }
    }

    return ValidationResult.success();
}

function validateAnswerToThirdPartyRelationshipAttributeQuery(
    query: ThirdPartyRelationshipAttributeQuery,
    attribute: IdentityAttribute | RelationshipAttribute,
    recipient: CoreAddress,
    sender: CoreAddress
): ValidationResult {
    if (!(attribute instanceof RelationshipAttribute)) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery("The provided Attribute is not a RelationshipAttribute, but a RelationshipAttribute was queried.")
        );
    }

    const recipientIsAttributeOwner = recipient.equals(attribute.owner);
    const senderIsAttributeOwner = sender.equals(attribute.owner);

    const queriedThirdParties = query.thirdParty.map((aThirdParty) => aThirdParty.toString());

    if (
        senderIsAttributeOwner ||
        (query.owner === "recipient" && !recipientIsAttributeOwner) ||
        (query.owner === "thirdParty" &&
            !queriedThirdParties.includes(attribute.owner.toString()) &&
            (!queriedThirdParties.includes("") || (recipientIsAttributeOwner && !queriedThirdParties.includes(recipient.toString()))))
    ) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute does not belong to a queried owner."));
    }

    if (query.owner === "" && !recipientIsAttributeOwner && !queriedThirdParties.includes("") && !queriedThirdParties.includes(attribute.owner.toString())) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery(
                "Neither you nor one of the involved third parties is the owner of the provided RelationshipAttribute, but an empty string was specified for the owner of the query."
            )
        );
    }

    if (attribute.confidentiality === RelationshipAttributeConfidentiality.Private) {
        return ValidationResult.error(
            CoreErrors.requests.invalidlyAnsweredQuery("The confidentiality of the provided RelationshipAttribute is private. Therefore you are not allowed to share it.")
        );
    }

    if (query.key !== attribute.key) {
        return ValidationResult.error(CoreErrors.requests.invalidlyAnsweredQuery("The provided RelationshipAttribute has not the queried key."));
    }

    return ValidationResult.success();
}
