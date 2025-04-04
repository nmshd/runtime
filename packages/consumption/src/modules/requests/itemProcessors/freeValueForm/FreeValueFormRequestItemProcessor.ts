import { FreeValueFormAcceptResponseItem, FreeValueFormRequestItem, FreeValueFormRequestItemTypes, ResponseItemResult } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFreeValueFormRequestItemParameters, AcceptFreeValueFormRequestItemParametersJSON } from "./AcceptFreeValueFormRequestItemParameters";

export class FreeValueFormRequestItemProcessor extends GenericRequestItemProcessor<FreeValueFormRequestItem, AcceptFreeValueFormRequestItemParametersJSON> {
    public override canAccept(requestItem: FreeValueFormRequestItem, params: AcceptFreeValueFormRequestItemParametersJSON): ValidationResult {
        const parsedParams = AcceptFreeValueFormRequestItemParameters.from(params);

        if (
            (requestItem.freeValueType === FreeValueFormRequestItemTypes.String && typeof parsedParams.freeValue !== "string") ||
            (requestItem.freeValueType === FreeValueFormRequestItemTypes.Number && typeof parsedParams.freeValue !== "number") ||
            (requestItem.freeValueType === FreeValueFormRequestItemTypes.Date && !(parsedParams.freeValue instanceof Date))
        ) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters(
                    `The freeValueType '${requestItem.freeValueType}' of the FreeValueFormRequestItem does not match the type '${typeof parsedParams.freeValue}' of the provided freeValue.`
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
