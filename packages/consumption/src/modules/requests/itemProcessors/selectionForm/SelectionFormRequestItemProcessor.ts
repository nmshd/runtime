import { Request, ResponseItemResult, SelectionFormFieldTypes, SelectionFormRequestItem } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ParsingError } from "@js-soft/ts-serval";
import { SelectionFormAcceptResponseItem } from "@nmshd/content/src/requests/items/selectionForm/SelectionFormAcceptResponseItem";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptSelectionFormRequestItemParameters, AcceptSelectionFormRequestItemParametersJSON } from "./AcceptSelectionFormRequestItemParameters";

export class SelectionFormRequestItemProcessor extends GenericRequestItemProcessor<SelectionFormRequestItem> {
    public override canCreateOutgoingRequestItem(requestItem: SelectionFormRequestItem, _request: Request): ValidationResult {
        if (requestItem.options.length === 0) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A SelectionFormRequestItem must provide at least one option."));
        }

        const uniqueOptions = new Set(requestItem.options);
        if (uniqueOptions.size !== requestItem.options.length) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A SelectionFormRequestItem must provide unique options."));
        }

        return ValidationResult.success();
    }

    public override canAccept(requestItem: SelectionFormRequestItem, params: AcceptSelectionFormRequestItemParametersJSON): ValidationResult {
        try {
            AcceptSelectionFormRequestItemParameters.from(params);
        } catch (error) {
            if (!(error instanceof ParsingError)) throw error;

            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The RequestItem was answered with incorrect parameters."));
        }

        const parsedParams = AcceptSelectionFormRequestItemParameters.from(params);

        if (parsedParams.options.length === 0) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("At least one option must be specified to accept a SelectionFormRequestItem."));
        }

        if (
            (requestItem.selectionType === SelectionFormFieldTypes.RadioButtonGroup || requestItem.selectionType === SelectionFormFieldTypes.DropdownMenu) &&
            parsedParams.options.length !== 1
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `A SelectionFormRequestItem of the '${requestItem.selectionType}' selectionType must be accepted with exactly one option.`
                )
            );
        }

        const uniqueOptions = new Set(parsedParams.options);
        if (uniqueOptions.size !== parsedParams.options.length) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The options specified for accepting a SelectionFormRequestItem must be unique."));
        }

        for (const option of parsedParams.options) {
            if (!requestItem.options.includes(option)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(`The SelectionRequestItem does not provide the option '${option}' for selection.`)
                );
            }
        }

        return ValidationResult.success();
    }

    public override accept(_requestItem: SelectionFormRequestItem, params: AcceptSelectionFormRequestItemParametersJSON): SelectionFormAcceptResponseItem {
        const parsedParams = AcceptSelectionFormRequestItemParameters.from(params);
        return SelectionFormAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            options: parsedParams.options
        });
    }
}
