import { ParsingError } from "@js-soft/ts-serval";
import { FreeValueAcceptFormResponseItem, FreeValueFormRequestItem, ResponseItemResult } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFreeValueFormRequestItemParameters, AcceptFreeValueFormRequestItemParametersJSON } from "./AcceptFreeValueFormRequestItemParameters";

export class FreeValueFormRequestItemProcessor extends GenericRequestItemProcessor<FreeValueFormRequestItem, AcceptFreeValueFormRequestItemParametersJSON> {
    public override canAccept(_requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): ValidationResult {
        try {
            AcceptFreeValueFormRequestItemParameters.from(params);
        } catch (error) {
            if (!(error instanceof ParsingError)) throw error;

            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The RequestItem was answered with incorrect parameters."));
        }

        return ValidationResult.success();
    }

    public override accept(_requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): FreeValueAcceptFormResponseItem {
        const parsedParams = AcceptFreeValueFormRequestItemParameters.from(params);
        return FreeValueAcceptFormResponseItem.from({
            result: ResponseItemResult.Accepted,
            freeValue: parsedParams.freeValue
        });
    }
}
