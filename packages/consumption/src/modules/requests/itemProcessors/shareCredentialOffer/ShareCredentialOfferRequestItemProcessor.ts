import { AcceptResponseItem, RejectResponseItem, Request, ResponseItemResult, ShareCredentialOfferRequestItem } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class ShareCredentialOfferRequestItemProcessor extends GenericRequestItemProcessor<ShareCredentialOfferRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: ShareCredentialOfferRequestItem, _request: Request, _recipient?: CoreAddress): Promise<ValidationResult> {
        await Promise.resolve(requestItem);

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: ShareCredentialOfferRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        await Promise.resolve({ requestItem, requestInfo });

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: ShareCredentialOfferRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<AcceptResponseItem> {
        await Promise.resolve({ requestItem, requestInfo });

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }

    public override async applyIncomingResponseItem(
        responseItem: AcceptResponseItem | RejectResponseItem,
        _requestItem: ShareCredentialOfferRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        await Promise.resolve({ responseItem, requestInfo });
    }
}
