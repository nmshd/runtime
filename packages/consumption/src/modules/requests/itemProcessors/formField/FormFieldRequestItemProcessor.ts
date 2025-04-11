import {
    BooleanFormFieldSettings,
    DateFormFieldSettings,
    DoubleFormFieldSettings,
    FormFieldAcceptResponseItem,
    FormFieldRequestItem,
    IntegerFormFieldSettings,
    minRating,
    RatingFormFieldSettings,
    Request,
    ResponseItemResult,
    SelectionFormFieldSettings,
    StringFormFieldSettings
} from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { CoreDate } from "@nmshd/core-types";
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

        if (
            requestItem.settings instanceof StringFormFieldSettings ||
            requestItem.settings instanceof IntegerFormFieldSettings ||
            requestItem.settings instanceof DoubleFormFieldSettings
        ) {
            if (requestItem.settings.max && requestItem.settings.min && requestItem.settings.max < requestItem.settings.min) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The max cannot be smaller than the min."));
            }
        }

        return ValidationResult.success();
    }

    public override canAccept(requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): ValidationResult {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        if (!(requestItem.settings instanceof SelectionFormFieldSettings)) {
            if (Array.isArray(parsedParams.response)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("Only a selection form field can be accepted with an array."));
            }

            if (
                (requestItem.settings instanceof StringFormFieldSettings && typeof parsedParams.response !== "string") ||
                (requestItem.settings instanceof IntegerFormFieldSettings && !Number.isInteger(parsedParams.response)) ||
                (requestItem.settings instanceof DoubleFormFieldSettings && typeof parsedParams.response !== "number") ||
                (requestItem.settings instanceof BooleanFormFieldSettings && typeof parsedParams.response !== "boolean") ||
                (requestItem.settings instanceof DateFormFieldSettings && !FormFieldRequestItemProcessor.isValidDate(parsedParams.response)) ||
                (requestItem.settings instanceof RatingFormFieldSettings && !FormFieldRequestItemProcessor.isValidRating(parsedParams.response, requestItem.settings.maxRating))
            ) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters(`The response provided cannot be used to accept the form field.`));
            }

            if (requestItem.settings instanceof StringFormFieldSettings && typeof parsedParams.response === "string") {
                if (requestItem.settings.max && parsedParams.response.length > requestItem.settings.max) {
                    return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The length of the response cannot be greater than the max."));
                }

                if (requestItem.settings.min && parsedParams.response.length < requestItem.settings.min) {
                    return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The length of the response cannot be smaller than the min."));
                }
            }

            if (
                (requestItem.settings instanceof IntegerFormFieldSettings || requestItem.settings instanceof DoubleFormFieldSettings) &&
                typeof parsedParams.response === "number"
            ) {
                if (requestItem.settings.max && parsedParams.response > requestItem.settings.max) {
                    return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The response cannot be greater than the max."));
                }

                if (requestItem.settings.min && parsedParams.response < requestItem.settings.min) {
                    return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The response cannot be smaller than the min."));
                }
            }
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

    private static isValidDate(value: any): boolean {
        return typeof value === "string" && CoreDate.from(value).dateTime.isValid;
    }

    private static isValidRating(value: any, maxRating: number): boolean {
        return Number.isInteger(value) && value >= minRating && value <= maxRating;
    }

    public override accept(_requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): FormFieldAcceptResponseItem {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        return FormFieldAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            response: parsedParams.response
        });
    }
}
