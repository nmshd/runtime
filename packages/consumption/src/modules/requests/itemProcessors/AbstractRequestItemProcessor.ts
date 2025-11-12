import { Event } from "@js-soft/ts-utils";
import { AcceptResponseItem, RejectResponseItem, Request, RequestItem, ResponseItem } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { ConsumptionController } from "../../../consumption/ConsumptionController.js";
import { ValidationResult } from "../../common/ValidationResult.js";
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters.js";
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters.js";
import { IRequestItemProcessor, LocalRequestInfo } from "./IRequestItemProcessor.js";

export abstract class AbstractRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> implements IRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams>
{
    protected accountController: AccountController;
    protected currentIdentityAddress: CoreAddress;

    public constructor(protected readonly consumptionController: ConsumptionController) {
        this.accountController = this.consumptionController.accountController;
        this.currentIdentityAddress = this.accountController.identity.address;
    }

    public abstract checkPrerequisitesOfIncomingRequestItem(requestItem: TRequestItem, requestInfo: LocalRequestInfo): boolean | Promise<boolean>;
    public abstract canAccept(requestItem: TRequestItem, params: TAcceptParams, requestInfo: LocalRequestInfo): ValidationResult | Promise<ValidationResult>;
    public abstract canReject(requestItem: TRequestItem, params: TRejectParams, requestInfo: LocalRequestInfo): ValidationResult | Promise<ValidationResult>;
    public abstract accept(requestItem: TRequestItem, params: TAcceptParams, requestInfo: LocalRequestInfo): AcceptResponseItem | Promise<AcceptResponseItem>;
    public abstract reject(requestItem: TRequestItem, params: TRejectParams, requestInfo: LocalRequestInfo): RejectResponseItem | Promise<RejectResponseItem>;
    public abstract canCreateOutgoingRequestItem(requestItem: TRequestItem, request: Request, recipient: CoreAddress): ValidationResult | Promise<ValidationResult>;
    public abstract canApplyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        requestInfo: LocalRequestInfo
    ): ValidationResult | Promise<ValidationResult>;
    public abstract applyIncomingResponseItem(responseItem: ResponseItem, requestItem: TRequestItem, requestInfo: LocalRequestInfo): Event | void | Promise<Event | void>;
}
