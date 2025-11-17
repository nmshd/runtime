/* eslint-disable @typescript-eslint/no-unused-vars */
import { Event } from "@js-soft/ts-utils";
import { AcceptResponseItem, RejectResponseItem, Request, RequestItem, ResponseItem, ResponseItemResult } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ValidationResult } from "../../common/ValidationResult.js";
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters.js";
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters.js";
import { AbstractRequestItemProcessor } from "./AbstractRequestItemProcessor.js";
import { LocalRequestInfo } from "./IRequestItemProcessor.js";

export class GenericRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> extends AbstractRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams> {
    public checkPrerequisitesOfIncomingRequestItem(requestItem: TRequestItem, requestInfo: LocalRequestInfo): Promise<boolean> | boolean {
        return true;
    }

    public canAccept(requestItem: TRequestItem, params: TAcceptParams, requestInfo: LocalRequestInfo): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success();
    }

    public canReject(requestItem: TRequestItem, params: TRejectParams, requestInfo: LocalRequestInfo): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success();
    }

    public accept(requestItem: TRequestItem, params: TAcceptParams, requestInfo: LocalRequestInfo): AcceptResponseItem | Promise<AcceptResponseItem> {
        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }

    public reject(requestItem: TRequestItem, params: TRejectParams, requestInfo: LocalRequestInfo): RejectResponseItem | Promise<RejectResponseItem> {
        return RejectResponseItem.from({ result: ResponseItemResult.Rejected, code: params.code, message: params.message });
    }

    public canCreateOutgoingRequestItem(requestItem: TRequestItem, request: Request, recipient?: CoreAddress): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success();
    }

    public canApplyIncomingResponseItem(responseItem: AcceptResponseItem, requestItem: TRequestItem, requestInfo: LocalRequestInfo): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success();
    }

    public applyIncomingResponseItem(responseItem: ResponseItem, requestItem: TRequestItem, requestInfo: LocalRequestInfo): Event | void | Promise<Event | void> {
        // do nothing
    }
}
