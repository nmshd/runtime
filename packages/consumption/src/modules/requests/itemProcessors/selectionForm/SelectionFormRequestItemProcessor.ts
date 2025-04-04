import { ParsingError } from "@js-soft/ts-serval";
import { ResponseItemResult, SelectionAcceptFormResponseItem, SelectionFormRequestItem } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptSelectionFormRequestItemParameters, AcceptSelectionFormRequestItemParametersJSON } from "./AcceptSelectionFormRequestItemParameters";

export class SelectionFormRequestItemProcessor extends GenericRequestItemProcessor<SelectionFormRequestItem, AcceptSelectionFormRequestItemParametersJSON> {
    public override canAccept(_requestItem: SelectionFormRequestItem, params: AcceptSelectionFormRequestItemParametersJSON): ValidationResult {
        try {
            AcceptSelectionFormRequestItemParameters.from(params);
        } catch (error) {
            if (!(error instanceof ParsingError)) throw error;

            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The RequestItem was answered with incorrect parameters."));
        }

        return ValidationResult.success();
    }

    public override accept(_requestItem: SelectionFormRequestItem, params: AcceptSelectionFormRequestItemParametersJSON): SelectionAcceptFormResponseItem {
        const parsedParams = AcceptSelectionFormRequestItemParameters.from(params);
        return SelectionAcceptFormResponseItem.from({
            result: ResponseItemResult.Accepted,
            options: parsedParams.options
        });
    }
}
