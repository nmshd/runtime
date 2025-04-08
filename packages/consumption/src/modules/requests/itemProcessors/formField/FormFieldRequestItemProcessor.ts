import { FormFieldAcceptResponseItem, FormFieldRequestItem, FreeValueFormField, FreeValueType, Request, ResponseItemResult, SelectionFormField } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFormFieldRequestItemParameters, AcceptFormFieldRequestItemParametersJSON } from "./AcceptFormFieldRequestItemParameters";

export class FormFieldRequestItemProcessor extends GenericRequestItemProcessor<FormFieldRequestItem, AcceptFormFieldRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: FormFieldRequestItem, _request: Request): ValidationResult {
        if (requestItem.selectionFormField instanceof SelectionFormField) {
            if (requestItem.selectionFormField.options.length === 0) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A selectionFormField must provide at least one option."));
            }

            const uniqueOptions = new Set(requestItem.selectionFormField.options);
            if (uniqueOptions.size !== requestItem.selectionFormField.options.length) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A selectionFormField must provide unique options."));
            }
        }

        return ValidationResult.success();
    }

    public override canAccept(requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): ValidationResult {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        if (requestItem.freeValueFormField instanceof FreeValueFormField) {
            if (
                ([FreeValueType.String, FreeValueType.String].includes(requestItem.freeValueFormField.freeValueType) && typeof parsedParams.freeValue !== "string") ||
                (requestItem.freeValueFormField.freeValueType === FreeValueType.Integer && !FormFieldRequestItemProcessor.canBeConvertedToValidNumber(parsedParams.freeValue)) ||
                (requestItem.freeValueFormField.freeValueType === FreeValueType.Date && !FormFieldRequestItemProcessor.canBeConvertedToValidDate(parsedParams.freeValue))
            ) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        `Conversion of the provided freeValue '${parsedParams.freeValue}' to the freeValueType '${requestItem.freeValueFormField.freeValueType}' of the freeValueFormField is not possible.`
                    )
                );
            }
        }

        if (requestItem.selectionFormField instanceof SelectionFormField) {
            if (parsedParams.options.length === 0) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("At least one option must be specified to accept a selectionFormField."));
            }

            if (!requestItem.selectionFormField.allowMultipleSelection) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(`A selectionFormField that does not allowMultipleSelection must be accepted with exactly one option.`)
                );
            }

            const uniqueOptions = new Set(parsedParams.options);
            if (uniqueOptions.size !== parsedParams.options.length) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The options specified for accepting a selectionFormField must be unique."));
            }

            for (const option of parsedParams.options) {
                if (!requestItem.selectionFormField.options.includes(option)) {
                    return ValidationResult.error(
                        ConsumptionCoreErrors.requests.invalidAcceptParameters(`The selectionFormField does not provide the option '${option}' for selection.`)
                    );
                }
            }
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

    public override accept(_requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): FormFieldAcceptResponseItem {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        if (parsedParams.freeValue) {
            return FormFieldAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                freeValue: parsedParams.freeValue
            });
        }

        return FormFieldAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            options: parsedParams.options
        });
    }
}
