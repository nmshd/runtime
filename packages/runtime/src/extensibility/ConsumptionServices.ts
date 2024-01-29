import { Inject } from "typescript-ioc";
import {
    AttributeListenersFacade,
    AttributesFacade,
    DraftsFacade,
    IncomingRequestsFacade,
    NotificationsFacade,
    OutgoingRequestsFacade,
    SettingsFacade
} from "./facades/consumption";

export class ConsumptionServices {
    public constructor(
        @Inject public readonly attributes: AttributesFacade,
        @Inject public readonly drafts: DraftsFacade,
        @Inject public readonly settings: SettingsFacade,
        @Inject public readonly incomingRequests: IncomingRequestsFacade,
        @Inject public readonly outgoingRequests: OutgoingRequestsFacade,
        @Inject public readonly attributeListeners: AttributeListenersFacade,
        @Inject public readonly notifications: NotificationsFacade
    ) {}
}
