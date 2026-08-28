import { AcceptResponseItem, RejectResponseItem, ResponseItemResult, ShareCredentialOfferRequestItem } from "@nmshd/content";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";
import { ShareCredentialOfferRequestItemProcessedByRecipientEvent } from "../../events";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class ShareCredentialOfferRequestItemProcessor extends GenericRequestItemProcessor<ShareCredentialOfferRequestItem> {
    public override async canAccept(
        requestItem: ShareCredentialOfferRequestItem,
        _params: AcceptRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        try {
            await this.consumptionController.openId4Vc.requestAllCredentialsFromCredentialOfferUrl(requestItem.credentialOfferUrl);
            return ValidationResult.success();
        } catch (error) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The credential offer at URL '${requestItem.credentialOfferUrl}' could not be processed. Cause: ${error}`)
            );
        }
    }

    public override async accept(
        requestItem: ShareCredentialOfferRequestItem,
        _params: AcceptRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<AcceptResponseItem> {
        const cachedCredentials = await this.consumptionController.openId4Vc.requestAllCredentialsFromCredentialOfferUrl(requestItem.credentialOfferUrl);
        await this.consumptionController.openId4Vc.storeCredentials(cachedCredentials);

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }

    public override applyIncomingResponseItem(
        responseItem: AcceptResponseItem | RejectResponseItem,
        requestItem: ShareCredentialOfferRequestItem,
        requestInfo: LocalRequestInfo
    ): ShareCredentialOfferRequestItemProcessedByRecipientEvent {
        return new ShareCredentialOfferRequestItemProcessedByRecipientEvent(this.currentIdentityAddress.toString(), {
            credentialOfferUrl: requestItem.credentialOfferUrl,
            accepted: responseItem.result === ResponseItemResult.Accepted,
            peer: requestInfo.peer
        });
    }
}
