import { FormFieldAcceptResponseItem, FormFieldRequestItem, FreeValueFormField, FreeValueType, Request, ResponseItemResult, SelectionFormField } from "@nmshd/content";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";

import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AcceptFormFieldRequestItemParameters, AcceptFormFieldRequestItemParametersJSON } from "./AcceptFormFieldRequestItemParameters";

export class FormFieldRequestItemProcessor extends GenericRequestItemProcessor<FormFieldRequestItem, AcceptFormFieldRequestItemParametersJSON> {
    public override canCreateOutgoingRequestItem(requestItem: FormFieldRequestItem, _request: Request): ValidationResult {
        if (requestItem.freeValueFormField instanceof FreeValueFormField) {
            if (requestItem.freeValueFormField.allowNewLines && requestItem.freeValueFormField.freeValueType !== FreeValueType.String) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A freeValueFormField with allowNewLines must be of freeValueType 'String'."));
            }

            if (requestItem.freeValueFormField.unit && ![FreeValueType.Integer, FreeValueType.Double].includes(requestItem.freeValueFormField.freeValueType)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("A freeValueFormField with unit must be of freeValueType 'Integer' or 'Double'."));
            }

            if (requestItem.freeValueFormField.min && ![FreeValueType.String, FreeValueType.Integer, FreeValueType.Double].includes(requestItem.freeValueFormField.freeValueType)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem("A freeValueFormField with min must be of freeValueType 'String', 'Integer' or 'Double'.")
                );
            }

            if (requestItem.freeValueFormField.max && ![FreeValueType.String, FreeValueType.Integer, FreeValueType.Double].includes(requestItem.freeValueFormField.freeValueType)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem("A freeValueFormField with max must be of freeValueType 'String', 'Integer' or 'Double'.")
                );
            }
        }

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
            if (Array.isArray(parsedParams.formFieldResponse)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("A freeValueFormField cannot be accepted with an array."));
            }

            if (
                (requestItem.freeValueFormField.freeValueType === FreeValueType.String && typeof parsedParams.formFieldResponse !== "string") ||
                (requestItem.freeValueFormField.freeValueType === FreeValueType.Integer && !Number.isInteger(parsedParams.formFieldResponse)) ||
                (requestItem.freeValueFormField.freeValueType === FreeValueType.Double && typeof parsedParams.formFieldResponse !== "number") ||
                (requestItem.freeValueFormField.freeValueType === FreeValueType.Boolean && typeof parsedParams.formFieldResponse !== "boolean") ||
                (requestItem.freeValueFormField.freeValueType === FreeValueType.Date &&
                    (typeof parsedParams.formFieldResponse !== "string" || !FormFieldRequestItemProcessor.canBeConvertedToValidDate(parsedParams.formFieldResponse)))
            ) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        `Conversion of the provided freeValue to the freeValueType '${requestItem.freeValueFormField.freeValueType}' of the freeValueFormField is not possible.`
                    )
                );
            }
        }

        if (requestItem.selectionFormField instanceof SelectionFormField) {
            if (!Array.isArray(parsedParams.formFieldResponse)) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("A selectionFormField must be accepted with an array."));
            }

            if (parsedParams.formFieldResponse.length === 0) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("At least one option must be specified to accept a selectionFormField."));
            }

            const uniqueOptions = new Set(parsedParams.formFieldResponse);
            if (uniqueOptions.size !== parsedParams.formFieldResponse.length) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The options specified for accepting a selectionFormField must be unique."));
            }

            if (!requestItem.selectionFormField.allowMultipleSelection && parsedParams.formFieldResponse.length !== 1) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(`A selectionFormField that does not allowMultipleSelection must be accepted with exactly one option.`)
                );
            }

            const unknownOptions: string[] = [];
            for (const option of parsedParams.formFieldResponse) {
                if (!requestItem.selectionFormField.options.includes(option)) {
                    unknownOptions.push(option);
                }
            }

            if (unknownOptions.length > 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        `The selectionFormField does not provide the following option(s) for selection: ${unknownOptions.map((option) => `'${option}'`).join(", ")}.`
                    )
                );
            }
        }

        return ValidationResult.success();
    }

    private static canBeConvertedToValidDate(value: string): boolean {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }

    public override accept(_requestItem: FormFieldRequestItem, params: AcceptFormFieldRequestItemParametersJSON): FormFieldAcceptResponseItem {
        const parsedParams = AcceptFormFieldRequestItemParameters.from(params);

        return FormFieldAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            formFieldResponse: parsedParams.formFieldResponse
        });
    }
}
