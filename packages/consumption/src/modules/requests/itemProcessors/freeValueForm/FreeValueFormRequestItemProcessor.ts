import { FreeValueFormAcceptResponseItem, FreeValueFormRequestItem, FreeValueFormRequestItemTypes, ResponseItemResult } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ParsingError } from "@js-soft/ts-serval";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFreeValueFormRequestItemParameters, AcceptFreeValueFormRequestItemParametersJSON } from "./AcceptFreeValueFormRequestItemParameters";

export class FreeValueFormRequestItemProcessor extends GenericRequestItemProcessor<FreeValueFormRequestItem, AcceptFreeValueFormRequestItemParametersJSON> {
    public override canAccept(requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): ValidationResult {
        try {
            AcceptFreeValueFormRequestItemParameters.from(params);
        } catch (error) {
            if (!(error instanceof ParsingError)) throw error;

            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The RequestItem was answered with incorrect parameters."));
        }

        const parsedParams = AcceptFreeValueFormRequestItemParameters.from(params);

        if (
            (requestItem.freeValueType === FreeValueFormRequestItemTypes.TextField && typeof parsedParams.freeValue !== "string") ||
            (requestItem.freeValueType === FreeValueFormRequestItemTypes.NumberField && (parsedParams.freeValue.trim() === "" || isNaN(Number(parsedParams.freeValue)))) ||
            (requestItem.freeValueType === FreeValueFormRequestItemTypes.DateField && isNaN(new Date(parsedParams.freeValue).getTime()))
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `Conversion of the provided freeValue '${parsedParams.freeValue}' to the freeValueType '${requestItem.freeValueType}' of the FreeValueFormRequestItem is not possible.`
                )
            );
        }

        return ValidationResult.success();
    }

    public override accept(_requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): FreeValueFormAcceptResponseItem {
        const parsedParams = AcceptFreeValueFormRequestItemParameters.from(params);
        return FreeValueFormAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            freeValue: parsedParams.freeValue
        });
    }
}
