import { IdentityAttributeQuery, IQLQuery, RelationshipAttributeQuery, ThirdPartyRelationshipAttributeQuery } from "@nmshd/content";
import { validate as iqlValidate } from "@nmshd/iql";
import { CoreAddress } from "@nmshd/transport";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";

export default function validateQuery(
    query: IdentityAttributeQuery | RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery | IQLQuery,
    sender: CoreAddress,
    recipient?: CoreAddress
): ValidationResult {
    if (query instanceof ThirdPartyRelationshipAttributeQuery) {
        for (const thirdParty of query.thirdParty) {
            const result = validateThirdParty(thirdParty, sender, recipient);
            if (result.isError()) return result;
        }
    } else if (query instanceof IQLQuery) {
        const validationResult = iqlValidate(query.queryString);
        if (!validationResult.isValid) {
            return ValidationResult.error(CoreErrors.requests.invalidRequestItem(`IQL query syntax error at character ${validationResult.error.location.start.column}`));
        }
    }

    return ValidationResult.success();
}

function validateThirdParty(thirdParty: CoreAddress, sender: CoreAddress, recipient?: CoreAddress): ValidationResult {
    if (thirdParty.equals(sender)) {
        return ValidationResult.error(CoreErrors.requests.invalidRequestItem("Cannot query an Attribute with the own address as third party."));
    }

    if (thirdParty.equals(recipient)) {
        return ValidationResult.error(CoreErrors.requests.invalidRequestItem("Cannot query an Attribute with the recipient's address as third party."));
    }

    return ValidationResult.success();
}
