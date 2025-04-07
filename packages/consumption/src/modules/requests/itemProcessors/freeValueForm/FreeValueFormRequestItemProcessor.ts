import { FreeValueFieldTypes, FreeValueFormAcceptResponseItem, FreeValueFormRequestItem, ResponseItemResult } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFreeValueFormRequestItemParameters, AcceptFreeValueFormRequestItemParametersJSON } from "./AcceptFreeValueFormRequestItemParameters";

export class FreeValueFormRequestItemProcessor extends GenericRequestItemProcessor<FreeValueFormRequestItem, AcceptFreeValueFormRequestItemParametersJSON> {
    public override canAccept(requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): ValidationResult {
        const parsedParams = AcceptFreeValueFormRequestItemParameters.from(params);

        if (
            (requestItem.freeValueFieldType === FreeValueFieldTypes.TextField && typeof parsedParams.freeValue !== "string") ||
            (requestItem.freeValueFieldType === FreeValueFieldTypes.NumberField && (parsedParams.freeValue.trim() === "" || isNaN(Number(parsedParams.freeValue)))) ||
            (requestItem.freeValueFieldType === FreeValueFieldTypes.DateField && isNaN(new Date(parsedParams.freeValue).getTime()))
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `Conversion of the provided freeValue '${parsedParams.freeValue}' to the freeValueFieldType '${requestItem.freeValueFieldType}' of the FreeValueFormRequestItem is not possible.`
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
