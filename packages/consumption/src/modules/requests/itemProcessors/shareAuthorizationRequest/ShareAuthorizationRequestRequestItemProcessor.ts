import { AcceptResponseItem, ResponseItemResult, ShareAuthorizationRequestRequestItem } from "@nmshd/content";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class ShareAuthorizationRequestRequestItemProcessor extends GenericRequestItemProcessor<ShareAuthorizationRequestRequestItem> {
    public override async canAccept(
        requestItem: ShareAuthorizationRequestRequestItem,
        _params: AcceptRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        try {
            const resolvedAuthorizationRequest = await this.consumptionController.openId4Vc.resolveAuthorizationRequest(requestItem.authorizationRequestUrl);
            if (resolvedAuthorizationRequest.matchingCredentials.length === 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The authorization request at URL '${requestItem.authorizationRequestUrl}' can't be fulfilled with the credentials currently in the wallet.`
                    )
                );
            }
            return ValidationResult.success();
        } catch (error) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    `The authorization request at URL '${requestItem.authorizationRequestUrl}' could not be processed. Cause: ${error}`
                )
            );
        }
    }

    public override async accept(
        requestItem: ShareAuthorizationRequestRequestItem,
        _params: AcceptRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<AcceptResponseItem> {
        const resolvedAuthorizationRequest = await this.consumptionController.openId4Vc.resolveAuthorizationRequest(requestItem.authorizationRequestUrl);
        await this.consumptionController.openId4Vc.acceptAuthorizationRequest(resolvedAuthorizationRequest.authorizationRequest);

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }
}
