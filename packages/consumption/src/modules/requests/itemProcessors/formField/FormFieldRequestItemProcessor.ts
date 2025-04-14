import { FormFieldAcceptResponseItem, FormFieldRequestItem, Request, ResponseItemResult } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFormFieldRequestItemParameters, AcceptFormFieldRequestItemParametersJSON } from "./AcceptFormFieldRequestItemParameters";

export class FormFieldRequestItemProcessor extends GenericRequestItemProcessor<FormFieldRequestItem, AcceptFormFieldRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: FormFieldRequestItem, _request: Request): ValidationResult {
        const canCreateSettingsError = requestItem.settings.canCreate();
        if (canCreateSettingsError) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem(canCreateSettingsError));
        }

        return ValidationResult.success();
    }

    public override canAccept(requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): ValidationResult {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        const canAcceptSettingsError = requestItem.settings.canAccept(parsedParams.response);
        if (canAcceptSettingsError) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters(canAcceptSettingsError));
        }

        return ValidationResult.success();
    }

    public override accept(_requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): FormFieldAcceptResponseItem {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        return FormFieldAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            response: parsedParams.response
        });
    }
}
