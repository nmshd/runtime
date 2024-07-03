import { RequestItem, RequestItemGroup } from "@nmshd/content";
import { CoreId } from "@nmshd/transport";
import { CoreErrors } from "../../../consumption/CoreErrors";
import { ValidationResult } from "../../common/ValidationResult";
import { LocalRequest } from "../local/LocalRequest";
import { DecideRequestItemGroupParametersJSON, isDecideRequestItemGroupParametersJSON } from "./decide/DecideRequestItemGroupParameters";
import { DecideRequestItemParametersJSON, isDecideRequestItemParametersJSON } from "./decide/DecideRequestItemParameters";
import { InternalDecideRequestParametersJSON } from "./decide/InternalDecideRequestParameters";

export class DecideRequestParametersValidator {
    public validate(params: InternalDecideRequestParametersJSON, request: LocalRequest): ValidationResult {
        if (!request.id.equals(CoreId.from(params.requestId))) {
            throw new Error("The response is invalid because the id of the Request does not match the id of the Response.");
        }

        if (params.items.length !== request.content.items.length) {
            return ValidationResult.error(CoreErrors.requests.decideValidation.invalidNumberOfItems("Number of items in Request and Response do not match."));
        }

        const validationResults = request.content.items.map((requestItem, index) => this.checkItemOrGroup(requestItem, params.items[index], params.accept));
        return ValidationResult.fromItems(validationResults);
    }

    private checkItemOrGroup(
        requestItem: RequestItem | RequestItemGroup,
        responseItem: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
        isRequestAccepted: boolean
    ): ValidationResult {
        if (requestItem instanceof RequestItem) {
            return this.checkItem(requestItem, responseItem, isRequestAccepted);
        }

        return this.checkItemGroup(requestItem, responseItem, isRequestAccepted);
    }

    private checkItem(requestItem: RequestItem, response: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON, isRequestAccepted: boolean): ValidationResult {
        if (isDecideRequestItemGroupParametersJSON(response)) {
            return ValidationResult.error(CoreErrors.requests.decideValidation.requestItemAnsweredAsRequestItemGroup());
        }

        if (!isRequestAccepted && response.accept) {
            return ValidationResult.error(CoreErrors.requests.decideValidation.itemAcceptedButParentNotAccepted("The RequestItem was accepted, but the Request was not accepted."));
        }

        if (isRequestAccepted && requestItem.mustBeAccepted && !response.accept) {
            return ValidationResult.error(
                CoreErrors.requests.decideValidation.mustBeAcceptedItemNotAccepted("The RequestItem is flagged as 'mustBeAccepted', but it was not accepted.")
            );
        }

        return ValidationResult.success();
    }

    private checkItemGroup(
        requestItemGroup: RequestItemGroup,
        responseItemGroup: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
        isRequestAccepted: boolean
    ): ValidationResult {
        if (isDecideRequestItemParametersJSON(responseItemGroup)) {
            return ValidationResult.error(CoreErrors.requests.decideValidation.requestItemGroupAnsweredAsRequestItem());
        }

        if (responseItemGroup.items.length !== requestItemGroup.items.length) {
            return ValidationResult.error(CoreErrors.requests.decideValidation.invalidNumberOfItems("Number of items in RequestItemGroup and ResponseItemGroup do not match."));
        }

        const validationResults = requestItemGroup.items.map((requestItem, index) => this.checkItem(requestItem, responseItemGroup.items[index], isRequestAccepted));
        return ValidationResult.fromItems(validationResults);
    }
}
