import { ParsingError } from "@js-soft/ts-serval";
import { FreeTextAcceptResponseItem, FreeTextRequestItem, ResponseItemResult } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { CoreErrors } from "../../../../consumption/CoreErrors";
import { AcceptFreeTextRequestItemParameters, AcceptFreeTextRequestItemParametersJSON } from "./AcceptFreeTextRequestItemParameters";

export class FreeTextRequestItemProcessor extends GenericRequestItemProcessor<FreeTextRequestItem, AcceptFreeTextRequestItemParametersJSON> {
    public override canAccept(_requestItem: FreeTextRequestItem, params: AcceptFreeTextRequestItemParametersJSON): ValidationResult {
        try {
            AcceptFreeTextRequestItemParameters.from(params);
        } catch (error) {
            if (!(error instanceof ParsingError)) throw error;

            return ValidationResult.error(CoreErrors.requests.invalidAcceptParameters("The RequestItem was answered with incorrect parameters."));
        }

        return ValidationResult.success();
    }

    public override accept(_requestItem: FreeTextRequestItem, params: AcceptFreeTextRequestItemParametersJSON): FreeTextAcceptResponseItem {
        const parsedParams = AcceptFreeTextRequestItemParameters.from(params);
        return FreeTextAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            freeText: parsedParams.freeText
        });
    }
}
