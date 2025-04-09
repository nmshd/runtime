import { FormFieldAcceptResponseItem, FormFieldRequestItem, Request, ResponseItemResult, SelectionFormFieldSettings, StringFormFieldSettings } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { BooleanFormFieldSettings } from "@nmshd/content/src/requests/items/formField/settings/BooleanFormFieldSettings";
import { DateFormFieldSettings } from "@nmshd/content/src/requests/items/formField/settings/DateFormFieldSettings";
import { DoubleFormFieldSettings } from "@nmshd/content/src/requests/items/formField/settings/DoubleFormFieldSettings";
import { IntegerFormFieldSettings } from "@nmshd/content/src/requests/items/formField/settings/IntegerFormFieldSettings";
import { RatingFormFieldSettings } from "@nmshd/content/src/requests/items/formField/settings/RatingFormFieldSettings";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFormFieldRequestItemParameters, AcceptFormFieldRequestItemParametersJSON } from "./AcceptFormFieldRequestItemParameters";

export class FormFieldRequestItemProcessor extends GenericRequestItemProcessor<FormFieldRequestItem, AcceptFormFieldRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: FormFieldRequestItem, _request: Request): ValidationResult {
        if (requestItem.settings instanceof SelectionFormFieldSettings) {
            if (requestItem.settings.options.length === 0) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A selection form field must provide at least one option."));
            }

            const uniqueOptions = new Set(requestItem.settings.options);
            if (uniqueOptions.size !== requestItem.settings.options.length) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A selection form field must provide unique options."));
            }
        }

        return ValidationResult.success();
    }

    public override canAccept(requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): ValidationResult {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        if (!(requestItem.settings instanceof SelectionFormFieldSettings) && Array.isArray(parsedParams.response)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("Only a selection form field can be accepted with an array."));
        }

        if (
            (requestItem.settings instanceof StringFormFieldSettings && typeof parsedParams.response !== "string") ||
            (requestItem.settings instanceof IntegerFormFieldSettings && !Number.isInteger(parsedParams.response)) ||
            (requestItem.settings instanceof DoubleFormFieldSettings && typeof parsedParams.response !== "number") ||
            (requestItem.settings instanceof BooleanFormFieldSettings && typeof parsedParams.response !== "boolean") ||
            (requestItem.settings instanceof DateFormFieldSettings &&
                (typeof parsedParams.response !== "string" || !FormFieldRequestItemProcessor.canBeConvertedToValidDate(parsedParams.response))) ||
            (requestItem.settings instanceof RatingFormFieldSettings && !FormFieldRequestItemProcessor.isIntegerInRange(parsedParams.response, 1, requestItem.settings.maxRating))
        ) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters(`The provided response does not match the type of the form field.`));
        }

        if (requestItem.settings instanceof SelectionFormFieldSettings) {
            if (!Array.isArray(parsedParams.response)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("A selection form field must be accepted with an array."));
            }

            if (parsedParams.response.length === 0) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("At least one option must be specified to accept a selection form field."));
            }

            const uniqueOptions = new Set(parsedParams.response);
            if (uniqueOptions.size !== parsedParams.response.length) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The options specified for accepting a selection form field must be unique."));
            }

            const unknownOptions: string[] = [];
            for (const option of parsedParams.response) {
                if (!requestItem.settings.options.includes(option)) {
                    unknownOptions.push(option);
                }
            }

            if (unknownOptions.length > 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        `The selection form field does not provide the following option(s) for selection: ${unknownOptions.map((option) => `'${option}'`).join(", ")}.`
                    )
                );
            }

            if (!requestItem.settings.allowMultipleSelection && parsedParams.response.length !== 1) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(`A selection form field that does not allowMultipleSelection must be accepted with exactly one option.`)
                );
            }
        }

        return ValidationResult.success();
    }

    private static canBeConvertedToValidDate(value: string): boolean {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }

    private static isIntegerInRange(value: any, min: number, max: number): boolean {
        return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
    }

    public override accept(_requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): FormFieldAcceptResponseItem {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        return FormFieldAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            response: parsedParams.response
        });
    }
}
