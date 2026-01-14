import { AcceptResponseItem, Request, ResponseItemResult, ShareAuthorizationRequestRequestItem } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { TransportCoreErrors } from "@nmshd/transport";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { LocalAttribute, OwnIdentityAttribute } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import {
    AcceptShareAuthorizationRequestRequestItemParameters,
    AcceptShareAuthorizationRequestRequestItemParametersJSON
} from "./AcceptShareAuthorizationRequestRequestItemParameters";

export class ShareAuthorizationRequestRequestItemProcessor extends GenericRequestItemProcessor<ShareAuthorizationRequestRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: ShareAuthorizationRequestRequestItem, _request: Request, _recipient?: CoreAddress): Promise<ValidationResult> {
        try {
            await this.consumptionController.openId4Vc.resolveAuthorizationRequest(requestItem.authorizationRequestUrl);
        } catch (_) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The authorization request url can't be resolved."));
        }

        return ValidationResult.success();
    }

    public override async canAccept(
        requestItem: ShareAuthorizationRequestRequestItem,
        params: AcceptShareAuthorizationRequestRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = AcceptShareAuthorizationRequestRequestItemParameters.from(params);

        const attribute = (await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId)) as OwnIdentityAttribute | undefined;
        if (!attribute) return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString()));

        let resolvedAuthorizationRequest;
        try {
            resolvedAuthorizationRequest = await this.consumptionController.openId4Vc.resolveAuthorizationRequest(requestItem.authorizationRequestUrl);
        } catch (_) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The authorization request url can't be resolved."));
        }

        const matchingCredentials = resolvedAuthorizationRequest.matchingCredentials;
        const matchingAttributeIds = matchingCredentials.map((c) => c.id.toString());
        if (!matchingAttributeIds.includes(parsedParams.attributeId.toString())) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidAcceptParameters("The credential selected for presentation doesn't match the query."));
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: ShareAuthorizationRequestRequestItem,
        params: AcceptShareAuthorizationRequestRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): Promise<AcceptResponseItem> {
        const parsedParams = AcceptShareAuthorizationRequestRequestItemParameters.from(params);

        const resolvedAuthorizationRequest = await this.consumptionController.openId4Vc.resolveAuthorizationRequest(requestItem.authorizationRequestUrl);

        const attribute = (await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId)) as OwnIdentityAttribute | undefined;
        if (!attribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString());

        await this.consumptionController.openId4Vc.acceptAuthorizationRequest(resolvedAuthorizationRequest.authorizationRequest, attribute);

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }
}
