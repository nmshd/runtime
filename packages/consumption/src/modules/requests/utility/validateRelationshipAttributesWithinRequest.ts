import {
    CreateAttributeRequestItem,
    ProposeAttributeRequestItem,
    ReadAttributeRequestItem,
    RelationshipAttribute,
    RelationshipAttributeQuery,
    RequestItem,
    RequestItemGroup
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../common";
import { DecideRequestItemGroupParametersJSON } from "../incoming/decide/DecideRequestItemGroupParameters";
import { DecideRequestItemParametersJSON } from "../incoming/decide/DecideRequestItemParameters";

interface RelationshipAttributeFragment {
    owner: string;
    key: string;
    value: { "@type": string };
}

type ContainsDuplicateRelationshipAttributeFragmentsResponse =
    | { containsDuplicates: false }
    | {
          containsDuplicates: true;
          duplicateFragment: RelationshipAttributeFragment;
      };

export function validateKeyUniquenessOfRelationshipAttributesWithinOutgoingRequest(items: (RequestItem | RequestItemGroup)[], recipient?: CoreAddress): ValidationResult {
    const fragmentsOfMustBeAcceptedItemsOfRequest = extractRelationshipAttributeFragmentsFromMustBeAcceptedItems(items, recipient);

    const containsMustBeAcceptedDuplicatesResult = containsDuplicateRelationshipAttributeFragments(fragmentsOfMustBeAcceptedItemsOfRequest);
    if (containsMustBeAcceptedDuplicatesResult.containsDuplicates) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.violatedKeyUniquenessOfRelationshipAttributes(
                `The Request cannot be created because its acceptance would lead to the creation of more than one RelationshipAttribute in the context of this Relationship with the same key '${containsMustBeAcceptedDuplicatesResult.duplicateFragment.key}', owner and value type.`
            )
        );
    }

    return ValidationResult.success();
}

export function validateKeyUniquenessOfRelationshipAttributesWithinIncomingRequest(
    items: (RequestItem | RequestItemGroup)[],
    params: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[],
    recipient: CoreAddress
): ValidationResult {
    const fragmentsOfMustBeAcceptedItemsOfRequest = extractRelationshipAttributeFragmentsFromMustBeAcceptedItems(items, recipient);

    const containsMustBeAcceptedDuplicatesResult = containsDuplicateRelationshipAttributeFragments(fragmentsOfMustBeAcceptedItemsOfRequest);
    if (containsMustBeAcceptedDuplicatesResult.containsDuplicates) {
        throw ConsumptionCoreErrors.requests.violatedKeyUniquenessOfRelationshipAttributes(
            `The Request can never be accepted because it would lead to the creation of more than one RelationshipAttribute in the context of this Relationship with the same key '${containsMustBeAcceptedDuplicatesResult.duplicateFragment.key}', owner and value type.`
        );
    }

    const fragmentsOfAcceptedItemsOfRequest: RelationshipAttributeFragment[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const decideItemParams = params[i];

        if (item instanceof RequestItemGroup) {
            const fragmentsOfAcceptedItemsOfGroup = extractRelationshipAttributeFragmentsFromAcceptedItemsOfGroup(item, decideItemParams as DecideRequestItemGroupParametersJSON);
            if (fragmentsOfAcceptedItemsOfGroup) {
                fragmentsOfAcceptedItemsOfRequest.push(...fragmentsOfAcceptedItemsOfGroup);
            }
        } else {
            const fragmentOfAcceptedRequestItem = extractRelationshipAttributeFragmentFromAcceptedRequestItem(item, decideItemParams as DecideRequestItemParametersJSON);
            if (fragmentOfAcceptedRequestItem) {
                fragmentsOfAcceptedItemsOfRequest.push(fragmentOfAcceptedRequestItem);
            }
        }
    }

    const containsAcceptedDuplicatesResult = containsDuplicateRelationshipAttributeFragments(fragmentsOfAcceptedItemsOfRequest);
    if (containsAcceptedDuplicatesResult.containsDuplicates) {
        return ValidationResult.error(
            ConsumptionCoreErrors.requests.invalidAcceptParameters(
                `The Request cannot be accepted with these parameters because it would lead to the creation of more than one RelationshipAttribute in the context of this Relationship with the same key '${containsAcceptedDuplicatesResult.duplicateFragment.key}', owner and value type.`
            )
        );
    }

    return ValidationResult.success();
}

function extractRelationshipAttributeFragmentsFromMustBeAcceptedItems(
    items: (RequestItem | RequestItemGroup)[],
    recipient?: CoreAddress
): RelationshipAttributeFragment[] | undefined {
    const fragmentsOfMustBeAcceptedItemsOfGroup: RelationshipAttributeFragment[] = [];

    for (const item of items) {
        if (item instanceof RequestItemGroup) {
            const fragments = extractRelationshipAttributeFragmentsFromMustBeAcceptedItems(item.items, recipient);
            if (fragments) fragmentsOfMustBeAcceptedItemsOfGroup.push(...fragments);
        } else {
            if (!item.mustBeAccepted) return;

            const fragment = extractRelationshipAttributeFragmentFromRequestItem(item, recipient);
            if (fragment) fragmentsOfMustBeAcceptedItemsOfGroup.push(fragment);
        }
    }

    return fragmentsOfMustBeAcceptedItemsOfGroup;
}

function extractRelationshipAttributeFragmentsFromAcceptedItemsOfGroup(
    requestItemGroup: RequestItemGroup,
    decideGroupParams: DecideRequestItemGroupParametersJSON
): RelationshipAttributeFragment[] | undefined {
    const fragmentsOfAcceptedItemsOfGroup: RelationshipAttributeFragment[] = [];

    for (let i = 0; i < requestItemGroup.items.length; i++) {
        const item = requestItemGroup.items[i];
        const decideItemParams = decideGroupParams.items[i];

        if (item instanceof RequestItem) {
            const fragment = extractRelationshipAttributeFragmentFromAcceptedRequestItem(item, decideItemParams);
            if (fragment) fragmentsOfAcceptedItemsOfGroup.push(fragment);
        }
    }

    if (fragmentsOfAcceptedItemsOfGroup.length !== 0) return fragmentsOfAcceptedItemsOfGroup;

    return;
}

function extractRelationshipAttributeFragmentFromAcceptedRequestItem(
    requestItem: RequestItem,
    decideItemParams: DecideRequestItemParametersJSON
): RelationshipAttributeFragment | undefined {
    if (decideItemParams.accept) {
        return extractRelationshipAttributeFragmentFromRequestItem(requestItem);
    }

    return;
}

function extractRelationshipAttributeFragmentFromRequestItem(requestItem: RequestItem, recipient?: CoreAddress): RelationshipAttributeFragment | undefined {
    if (requestItem instanceof CreateAttributeRequestItem && requestItem.attribute instanceof RelationshipAttribute) {
        const ownerIsEmptyString = requestItem.attribute.owner.toString() === "";
        return {
            owner: ownerIsEmptyString && recipient ? recipient.toString() : requestItem.attribute.owner.toString(),
            key: requestItem.attribute.key,
            value: { "@type": requestItem.attribute.value.toJSON()["@type"] }
        };
    }

    if ((requestItem instanceof ReadAttributeRequestItem || requestItem instanceof ProposeAttributeRequestItem) && requestItem.query instanceof RelationshipAttributeQuery) {
        const ownerIsEmptyString = requestItem.query.owner.toString() === "";
        return {
            owner: ownerIsEmptyString && recipient ? recipient.toString() : requestItem.query.owner.toString(),
            key: requestItem.query.key,
            value: { "@type": requestItem.query.attributeCreationHints.valueType }
        };
    }

    return;
}

function containsDuplicateRelationshipAttributeFragments(fragments?: RelationshipAttributeFragment[]): ContainsDuplicateRelationshipAttributeFragmentsResponse {
    if (!fragments) return { containsDuplicates: false };

    const seenIdentifier = new Set<string>();

    for (const fragment of fragments) {
        const identifierOfFragment = JSON.stringify(fragment);

        if (seenIdentifier.has(identifierOfFragment)) {
            return { containsDuplicates: true, duplicateFragment: fragment };
        }

        seenIdentifier.add(identifierOfFragment);
    }

    return { containsDuplicates: false };
}
