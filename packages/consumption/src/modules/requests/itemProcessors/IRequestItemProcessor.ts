import { Event } from "@js-soft/ts-utils";
import { AcceptResponseItem, RejectResponseItem, Request, RequestItem, ResponseItem } from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { ValidationResult } from "../../common/ValidationResult.js";
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters.js";
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters.js";

export interface LocalRequestInfo {
    id: CoreId;
    peer: CoreAddress;
}

export interface IRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> {
    checkPrerequisitesOfIncomingRequestItem(requestItem: TRequestItem, requestInfo: LocalRequestInfo): Promise<boolean> | boolean;
    canAccept(requestItem: TRequestItem, params: TAcceptParams, requestInfo: LocalRequestInfo): Promise<ValidationResult> | ValidationResult;
    canReject(requestItem: TRequestItem, params: TRejectParams, requestInfo: LocalRequestInfo): Promise<ValidationResult> | ValidationResult;
    accept(requestItem: TRequestItem, params: TAcceptParams, requestInfo: LocalRequestInfo): Promise<AcceptResponseItem> | AcceptResponseItem;
    reject(requestItem: TRequestItem, params: TRejectParams, requestInfo: LocalRequestInfo): Promise<RejectResponseItem> | RejectResponseItem;

    canCreateOutgoingRequestItem(requestItem: TRequestItem, request: Request, recipient?: CoreAddress): Promise<ValidationResult> | ValidationResult;
    canApplyIncomingResponseItem(responseItem: ResponseItem, requestItem: TRequestItem, requestInfo: LocalRequestInfo): Promise<ValidationResult> | ValidationResult;
    applyIncomingResponseItem(responseItem: ResponseItem, requestItem: TRequestItem, requestInfo: LocalRequestInfo): Event | void | Promise<Event | void>;
}
