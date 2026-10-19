import { AcceptResponseItem, Request, ResponseItemResult, ShareAuthorizationRequestRequestItem } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { TransportCoreErrors, TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { LocalAttribute } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { isVerifiableCredentialAttribute } from "../../../openid4vc";
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

        const attribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);
        if (!isVerifiableCredentialAttribute(attribute)) {
            return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString()));
        }

        let resolvedAuthorizationRequest;
        try {
            resolvedAuthorizationRequest = await this.consumptionController.openId4Vc.resolveAuthorizationRequest(requestItem.authorizationRequestUrl);
        } catch (_) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The authorization request url can't be resolved."));
        }

        const credentialQueryCount = resolvedAuthorizationRequest.authorizationRequest.authorizationRequestPayload.dcql_query?.credentials.length ?? 0;
        if (credentialQueryCount !== 1) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidAcceptParameters("Authorization requests asking for multiple credentials can't be accepted via a RequestItem.")
            );
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

        const attribute = await this.consumptionController.attributes.getLocalAttribute(parsedParams.attributeId);
        if (!isVerifiableCredentialAttribute(attribute)) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.attributeId.toString());

        const authorizationRequest = resolvedAuthorizationRequest.authorizationRequest;
        const queryId = authorizationRequest.authorizationRequestPayload.dcql_query?.credentials[0].id;
        if (!queryId) throw ConsumptionCoreErrors.requests.invalidAcceptParameters("The authorization request has no credential query.");

        const acceptResult = await this.consumptionController.openId4Vc.acceptAuthorizationRequest(authorizationRequest, { [queryId]: [attribute] });
        if (acceptResult.status !== 200) {
            TransportLoggerFactory.getLogger(ShareAuthorizationRequestRequestItemProcessor).error(
                "Failed to accept ShareAuthorizationRequestRequestItem. Error message:",
                JSON.stringify(acceptResult.message)
            );

            throw ConsumptionCoreErrors.requests.invalidAcceptParameters("The presentation was not successful. Try again later or select a different credential.");
        }

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted });
    }
}
