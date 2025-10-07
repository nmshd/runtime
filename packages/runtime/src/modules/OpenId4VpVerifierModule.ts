import {
    DCQLQueryJSON,
    ReadAttributeAcceptResponseItemJSON,
    ReadAttributeRequestItemJSON,
    RequestItemGroupJSON,
    ResponseItemGroupJSON,
    VerifiableCredentialJSON
} from "@nmshd/content";
import { LocalRequestStatus } from "@nmshd/runtime-types";
import { OutgoingRequestStatusChangedEvent } from "../events";
import { RuntimeModule } from "../extensibility/modules/RuntimeModule";

export class RequestModule extends RuntimeModule {
    public init(): void {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(OutgoingRequestStatusChangedEvent, this.handleOutgoingRequestStatusChanged.bind(this));
    }

    private async handleOutgoingRequestStatusChanged(event: OutgoingRequestStatusChangedEvent) {
        if (event.data.newStatus !== LocalRequestStatus.Completed) return;

        const requestItems = event.data.request.content.items.map((i) => (i["@type"] === "RequestItemGroup" ? (i as RequestItemGroupJSON).items : [i])).flat();
        const responseItems = event.data.request.response!.content.items.map((i) => (i["@type"] === "ResponseItemGroup" ? (i as ResponseItemGroupJSON).items : [i])).flat();
        const requestResponseCombinedItems = requestItems.map((item, i) => {
            return {
                requestItem: item,
                responseItem: responseItems[i]
            };
        });

        const itemsWithSharedCredential = requestResponseCombinedItems.filter(
            (i) => i.requestItem["@type"] === "ReadAttributeRequestItem" && (i.requestItem as ReadAttributeRequestItemJSON).query["@type"] === "DCQLQuery"
        );

        const queryPresentationCombinedItems = itemsWithSharedCredential.map((i) => {
            return {
                query: (i.requestItem as ReadAttributeRequestItemJSON).query as DCQLQueryJSON,
                credential: (i.responseItem as ReadAttributeAcceptResponseItemJSON).attribute.value as VerifiableCredentialJSON
            };
        });

        const services = await this.runtime.getServices(event.eventTargetAddress);
        const verificationResults = await Promise.all(queryPresentationCombinedItems.map((i) => services.consumptionServices.openId4Vc.verifySharedCredential(i)));

        this.logger.info(
            `Verifying the response to request ${event.data.request.id} had the results`,
            verificationResults.map((r) => (r.value.verified ? "Success, " : `Error ${r.value.reason}, `))
        );
    }
}
