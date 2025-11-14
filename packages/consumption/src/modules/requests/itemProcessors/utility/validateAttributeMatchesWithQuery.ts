import {
    Consent,
    IdentityAttribute,
    IdentityAttributeQuery,
    IQLQuery,
    RelationshipAttribute,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors.js";
import { ValidationResult } from "../../../common/ValidationResult.js";

export default function validateAttributeMatchesWithQuery(
    query: IdentityAttributeQuery | IQLQuery | RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery,
    attribute: IdentityAttribute | RelationshipAttribute,
    recipient: CoreAddress,
    sender: CoreAddress
): ValidationResult {
    if (query instanceof IdentityAttributeQuery) {
        const result = validateAttributeMatchesWithIdentityAttributeQuery(query, attribute, recipient);
        if (result.isError()) return result;
    } else if (query instanceof IQLQuery) {
        const result = validateAttributeMatchesWithIQLQuery(query, attribute, recipient);
        if (result.isError()) return result;
    } else if (query instanceof RelationshipAttributeQuery) {
        const result = validateAttributeMatchesWithRelationshipAttributeQuery(query, attribute, recipient);
        if (result.isError()) return result;
    } else if (query instanceof ThirdPartyRelationshipAttributeQuery) {
        const result = validateAttributeMatchesWithThirdPartyRelationshipAttributeQuery(query, attribute, recipient, sender);
        if (result.isError()) return result;
    } else {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.unexpectedErrorDuringRequestItemProcessing(
                "The query is not of a known type. Only the IdentityAttributeQuery, IQLQuery, RelationshipAttributeQuery or ThirdPartyRelationshipAttributeQuery can be used."
            )
        );
    }

    return ValidationResult.success();
}

function validateAttributeMatchesWithIdentityAttributeQuery(
    query: IdentityAttributeQuery,
    attribute: IdentityAttribute | RelationshipAttribute,
    recipient: CoreAddress
): ValidationResult {
    if (!(attribute instanceof IdentityAttribute)) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided Attribute is not an IdentityAttribute, but an IdentityAttribute was queried.")
        );
    }

    const recipientIsAttributeOwner = recipient.equals(attribute.owner);

    if (!recipientIsAttributeOwner) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided IdentityAttribute belongs to someone else. You can only share OwnIdentityAttributes.")
        );
    }

    if (query.valueType !== attribute.value.constructor.name) {
        return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided IdentityAttribute is not of the queried IdentityAttribute value type."));
    }

    if (query.tags && query.tags.length !== 0) {
        if (attribute.tags === undefined || attribute.tags.length === 0 || !query.tags.some((aQueriedTag) => attribute.tags!.includes(aQueriedTag))) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.attributeQueryMismatch("The tags of the provided IdentityAttribute do not contain at least one queried tag.")
            );
        }
    }

    return ValidationResult.success();
}

function validateAttributeMatchesWithIQLQuery(_: IQLQuery, attribute: IdentityAttribute | RelationshipAttribute, recipient: CoreAddress): ValidationResult {
    if (!(attribute instanceof IdentityAttribute)) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch(
                "The provided Attribute is not an IdentityAttribute. Currently, only IdentityAttributes can be queried by an IQLQuery."
            )
        );
    }

    const recipientIsAttributeOwner = recipient.equals(attribute.owner);

    if (!recipientIsAttributeOwner) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided IdentityAttribute belongs to someone else. You can only share OwnIdentityAttributes.")
        );
    }

    return ValidationResult.success();
}

function validateAttributeMatchesWithRelationshipAttributeQuery(
    query: RelationshipAttributeQuery,
    attribute: IdentityAttribute | RelationshipAttribute,
    recipient: CoreAddress
): ValidationResult {
    if (!(attribute instanceof RelationshipAttribute)) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided Attribute is not a RelationshipAttribute, but a RelationshipAttribute was queried.")
        );
    }

    const recipientIsAttributeOwner = recipient.equals(attribute.owner);
    const queriedOwnerIsEmpty = query.owner.equals("");

    if (!queriedOwnerIsEmpty && !query.owner.equals(attribute.owner)) {
        return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute does not belong to the queried owner."));
    }

    if (queriedOwnerIsEmpty && !recipientIsAttributeOwner) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch(
                "You are not the owner of the provided RelationshipAttribute, but an empty string was specified for the owner of the query."
            )
        );
    }

    if (query.key !== attribute.key) {
        return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute does not have the queried key."));
    }

    if (query.attributeCreationHints.confidentiality !== attribute.confidentiality) {
        return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute does not have the queried confidentiality."));
    }

    if (query.attributeCreationHints.valueType !== attribute.value.constructor.name) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute is not of the queried RelationshipAttribute value type.")
        );
    }

    if (!(attribute.value instanceof Consent)) {
        if (query.attributeCreationHints.title !== attribute.value.title) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute does not have the queried title."));
        }

        if (query.attributeCreationHints.description !== attribute.value.description) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute does not have the queried description."));
        }
    }

    return ValidationResult.success();
}

function validateAttributeMatchesWithThirdPartyRelationshipAttributeQuery(
    query: ThirdPartyRelationshipAttributeQuery,
    attribute: IdentityAttribute | RelationshipAttribute,
    recipient: CoreAddress,
    sender: CoreAddress
): ValidationResult {
    if (!(attribute instanceof RelationshipAttribute)) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided Attribute is not a RelationshipAttribute, but a RelationshipAttribute was queried.")
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
        return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute does not belong to a queried owner."));
    }

    if (query.owner === "" && !recipientIsAttributeOwner && !queriedThirdParties.includes("") && !queriedThirdParties.includes(attribute.owner.toString())) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.attributeQueryMismatch(
                "Neither you nor one of the involved third parties is the owner of the provided RelationshipAttribute, but an empty string was specified for the owner of the query."
            )
        );
    }

    if (query.key !== attribute.key) {
        return ValidationResult.error(ConsumptionCoreErrors.requests.attributeQueryMismatch("The provided RelationshipAttribute does not have the queried key."));
    }

    return ValidationResult.success();
}
