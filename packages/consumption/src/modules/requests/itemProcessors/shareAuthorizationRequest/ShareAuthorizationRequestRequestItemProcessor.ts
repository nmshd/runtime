import { AcceptResponseItem, ResponseItemResult, ShareAuthorizationRequestRequestItem } from "@nmshd/content";
import { OwnIdentityAttribute } from "../../../attributes";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import { AcceptShareAuthorizationRequestRequestItemParametersJSON } from "./AcceptShareAuthorizationRequestRequestItemParameters";

export class ShareAuthorizationRequestRequestItemProcessor extends GenericRequestItemProcessor<ShareAuthorizationRequestRequestItem> {
    public override async accept(
        requestItem: ShareAuthorizationRequestRequestItem,
        params: AcceptShareAuthorizationRequestRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<AcceptResponseItem> {
        const resolvedAuthorizationRequest = await this.consumptionController.openId4Vc.resolveAuthorizationRequest(requestItem.authorizationRequestUrl);
        await this.consumptionController.openId4Vc.acceptAuthorizationRequest(resolvedAuthorizationRequest.authorizationRequest, OwnIdentityAttribute.from(params.attribute));

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }
}
