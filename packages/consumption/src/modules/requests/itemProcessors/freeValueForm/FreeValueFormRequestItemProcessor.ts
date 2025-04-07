import { FreeValueFieldTypes, FreeValueFormAcceptResponseItem, FreeValueFormRequestItem, ResponseItemResult } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFreeValueFormRequestItemParameters, AcceptFreeValueFormRequestItemParametersJSON } from "./AcceptFreeValueFormRequestItemParameters";

export class FreeValueFormRequestItemProcessor extends GenericRequestItemProcessor<FreeValueFormRequestItem, AcceptFreeValueFormRequestItemParametersJSON> {
    public override canAccept(requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): ValidationResult {
        const parsedParams = AcceptFreeValueFormRequestItemParameters.from(params);

        if (
            ([FreeValueFieldTypes.TextField, FreeValueFieldTypes.TextAreaField].includes(requestItem.freeValueFieldType) && typeof parsedParams.freeValue !== "string") ||
            (requestItem.freeValueFieldType === FreeValueFieldTypes.NumberField && !FreeValueFormRequestItemProcessor.canBeConvertedToValidNumber(parsedParams.freeValue)) ||
            (requestItem.freeValueFieldType === FreeValueFieldTypes.DateField && !FreeValueFormRequestItemProcessor.canBeConvertedToValidDate(parsedParams.freeValue))
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `Conversion of the provided freeValue '${parsedParams.freeValue}' to the freeValueFieldType '${requestItem.freeValueFieldType}' of the FreeValueFormRequestItem is not possible.`
                )
            );
        }

        return ValidationResult.success();
    }

    private static canBeConvertedToValidNumber(value: string): boolean {
        const valueIsEmptyString = value.trim() === "";
        return !valueIsEmptyString && !isNaN(Number(value));
    }

    private static canBeConvertedToValidDate(value: string): boolean {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }

    public override accept(_requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): FreeValueFormAcceptResponseItem {
        const parsedParams = AcceptFreeValueFormRequestItemParameters.from(params);
        return FreeValueFormAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            freeValue: parsedParams.freeValue
        });
    }
}
