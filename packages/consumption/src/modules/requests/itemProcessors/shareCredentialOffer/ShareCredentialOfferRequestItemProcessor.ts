import { AcceptResponseItem, RejectResponseItem, Request, ResponseItemResult, ShareCredentialOfferRequestItem } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";
import { ShareCredentialOfferRequestItemProcessedByRecipientEvent } from "../../events";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class ShareCredentialOfferRequestItemProcessor extends GenericRequestItemProcessor<ShareCredentialOfferRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: ShareCredentialOfferRequestItem, _request: Request, _recipient?: CoreAddress): Promise<ValidationResult> {
        const offer = await this.consumptionController.openId4Vc.resolveCredentialOffer(requestItem.credentialOfferUrl);

        const preAuthorizedCodeGrant = offer.credentialOfferPayload.grants?.["urn:ietf:params:oauth:grant-type:pre-authorized_code"];
        const isUnauthenticatedOffer = preAuthorizedCodeGrant && !preAuthorizedCodeGrant.tx_code;
        if (!isUnauthenticatedOffer) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem("Only unauthenticated credential offers (pre-authorized code grants without tx_code) are supported.")
            );
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: ShareCredentialOfferRequestItem,
        _params: AcceptRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        try {
            await this.consumptionController.openId4Vc.requestCredentialsCached(requestItem.credentialOfferUrl);
            return ValidationResult.success();
        } catch (_) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(`The credential offer at URL '${requestItem.credentialOfferUrl}' could not be processed.`)
            );
        }
    }

    public override async accept(
        requestItem: ShareCredentialOfferRequestItem,
        _params: AcceptRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<AcceptResponseItem> {
        const cachedCredentials = await this.consumptionController.openId4Vc.requestCredentialsCached(requestItem.credentialOfferUrl);
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
